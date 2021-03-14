var express = require('express');
const app = require('../app');
var router = express.Router();
var formidable = require('formidable');
var crypto = require('crypto')
const nodemailer = require('nodemailer')
var fs = require('fs')


/* GET home page. */
router.get('/', function(req, res, next) {
    res.render('index', { title: 'Express' });
});

router.get('/produse', function(req, res, next) {
    res.render('produse', { title: 'Express' });
})

router.get('/galerie_animata', function(req, res, next) {
    res.render('galerie_animata', { title: 'Express' });
})


var mysql = require('mysql');

var conexiune = mysql.createConnection({
    host: "localhost",
    user: "mirceaROOT",
    password: "testtesttest",
    database: "proiecttw"
});

conexiune.connect(function(err) {
    if (err) {
        console.log("Conexiune esuata!");
    } else {
        console.log("CONEXIUNE REUSITA! :D")
    }
});

router.get('/cumpar', function(req, res, next) {
    var a = "ionel";
    var b = 17;
    conexiune.query("select * from produse", function(err, rez, campuri) {
        if (err) throw err;
        console.log(rez);
        res.render('produseSQL', { param_a: a, param_b: b, produse: rez });
    });

})

router.get('/prod/:abc', function(req, res, next) {
    var idProd = req.params.abc;
    conexiune.query("select * from produse where idproduse =" + idProd, function(err, rez, campuri) {
        if (err) throw err;
        console.log(rez);
        res.render('pag_produs', { produs_unic: rez[0] });
    });
})

module.exports = router;


function getUtiliz(req) {
    var utiliz;
    if (req.session) {
        utiliz = req.session.utilizator
    } else { utiliz = null }
    return utiliz;
}

router.get('/utilizatori', function(req, res) {

    if (req.session && req.session.utilizator && req.session.utilizator.rol == "admin") {
        conexiune.query("select * from utilizatori", function(err, rezultat, campuri) {
            if (err) throw err;
            console.log(rezultat);
            res.render('utilizatori', { utilizatori: rezultat, utilizator: getUtiliz(req) }); //afisez index-ul in acest caz
        });
    } else {
        res.render('error', { message: "Aceasta cale nu exista!", utilizator: req.session.utilizator });
    }

});

router.post("/utilizatori", function(req, res) {

    if (req.session && req.session.utilizator && req.session.utilizator.rol == "admin") {
        var campuriText = req.body;
        var comanda = `update utilizatori set blocat = not blocat where id='${campuriText.nume_input}'`;
        conexiune.query(comanda, function(err, rez, campuri) {
            conexiune.query(`select username, email, prenume, nume, blocat from utilizatori where id='${campuriText.nume_input}'`, function(err, rezz, campuri) {
                console.log(rezz)
                var utl = rezz[0]

                if (utl.blocat == 1) {
                    trimiteMailBlocat(utl.username, utl.email, utl.prenume, utl.nume)
                }

            })
        });

    }
    res.redirect("/utilizatori");
})

router.get('/*', function(req, res) {
    var utiliz;
    if (req.session) {
        utiliz = req.session.utilizator
    } else { utiliz = null }

    console.log(req.url, "tried to acc", req.session)

    if (req.url == '/logout') {
        console.log("logout");
        req.session.destroy();
        res.redirect("/");
    }

    res.render(req.url.replace("/", ""), { utilizator: utiliz }, function(err, rezRandare) {
        if (err) {

            if (err.message.indexOf("Failed to lookup view") != -1) {
                console.log("ERR!!", err)
                res.status(404).render('error', { utilizator: utiliz, message: "Aceasta cale nu exista!" })
            } else throw err
        } else res.send(rezRandare)
    });
});


// ----- inregistrare -----
var parolaServer = "tehniciweb";
router.post('/inreg', function(req, res) {
    var username;
    var formular = formidable.IncomingForm()
    console.log("am intrat pe post");
    var cale_adev = null;

    //nr ordine: 4
    formular.parse(req, function(err, campuriText, campuriFisier) { //se executa dupa ce a fost primit formularul si parsat
        console.log("parsare")
        var eroare = "";
        console.log(campuriText);

        //verificari campuri
        if (campuriText.username == "") {
            eroare += "Username nesetat<br>";
        }

        if (campuriText.nume == "") {
            eroare += "Nume nesetat<br>";
        }

        if (campuriText.prenume == "") {
            eroare += "Prenume nesetat<br>";
        }

        if (campuriText.parola == "") {
            eroare += "Parola nesetata<br>";
        }

        if (campuriText.email == "") {
            eroare += "Email nesetat<br>";
        }

        if (eroare == "") {
            unescapedUsername = campuriText.username
            unescapedEmail = campuriText.email
                // facem asta ^^ pentru a evita escape-urile din numele variabilelor


            // protejeaza de SQL INJECTION
            campuriText.username = mysql.escape(campuriText.username)
            campuriText.nume = mysql.escape(campuriText.nume)
            campuriText.prenume = mysql.escape(campuriText.prenume)
            var parolaCriptata = mysql.escape(crypto.scryptSync(campuriText.parola, parolaServer, 32).toString("base64")) + "";
            campuriText.email = mysql.escape(campuriText.email)
            campuriText.poza = mysql.escape(campuriText.poza)
                //


            var preluare = `select id from utilizatori where username =${campuriText.username} `;
            conexiune.query(preluare, function(err, rez, campuri) {
                if (err) {
                    console.log(err);
                    throw err;
                }
                if (rez.length) {
                    eroare += "Username deja existent <br>"
                    res.render('inregistrare', { err: eroare, raspuns: "Completati corect campurile" });
                } else {
                    //daca nu am erori procesez campurile

                    var comanda = `insert into utilizatori (nume, prenume, username,parola, email, imagine) values( ${campuriText.nume}, ${campuriText.prenume},  ${campuriText.username},  ${parolaCriptata},  ${campuriText.email},  ${cale_adev} )`;

                    conexiune.query(comanda, function(err, rez, campuri) {
                        if (err) {
                            console.log(err);
                            throw err;
                        }
                        trimiteMail(unescapedUsername, unescapedEmail);
                        console.log("ceva");
                        res.render('inregistrare', { err: "", raspuns: "Date introduse" });
                    })
                }

            })


        } else {
            res.render('inregistrare', { err: eroare, raspuns: "Completati corect campurile" });
        }
    })

    //nr ordine: 1
    formular.on("field", function(name, field) {
        if (name == 'username') {
            if (!(field.includes('\\') || field.includes('/'))) {
                username = field;
            } else {
                username = "defaultFolder";
            }

        }
        console.log("camp - field:", name)
    });

    //nr ordine: 2
    formular.on("fileBegin", function(name, campFisier) {
        console.log("inceput upload: ", campFisier);
        if (campFisier && campFisier.name != "") {
            //am  fisier transmis
            var cale = __dirname + "\\..\\poze_uploadate\\" + username
            if (!fs.existsSync(cale))
                fs.mkdirSync(cale);
            campFisier.path = cale + "\\" + campFisier.name;
            console.log(campFisier.path);
            cale_adev = mysql.escape(campFisier.name)
        }
    });

    //nr ordine: 3
    formular.on("file", function(name, field) {
        console.log("final upload: ", name);
    });

});

async function trimiteMail(username, email) {
    var transp = nodemailer.createTransport({
        service: "gmail",
        secure: false,
        auth: { //date login 
            user: "test.tweb.node@gmail.com",
            pass: "tehniciweb"
        },
        tls: {
            rejectUnauthorized: false
        }
    });
    //genereaza html
    await transp.sendMail({
        from: "test.tweb.node@gmail.com",
        to: email,
        subject: "Buna, " + username,
        text: "Bine ai venit in comunitatea Lumea Origami.",
        html: "<h1><span style=\"color:lightblue\">Bine ai venit</span></h1><h3>in comunitatea Lumea Origami.</h3>",
    })
    console.log("trimis mail");
}


async function trimiteMailBlocat(username, email, prenume, nume) {
    var transp = nodemailer.createTransport({
        service: "gmail",
        secure: false,
        auth: { //date login 
            user: "test.tweb.node@gmail.com",
            pass: "tehniciweb"
        },
        tls: {
            rejectUnauthorized: false
        }
    });

    await transp.sendMail({
        from: "test.tweb.node@gmail.com",
        to: email,
        subject: "Te-am blocat, " + username,
        text: "N-ai fost cuminte," + prenume + " " + nume + " așa că te-am blocat! ",
        html: "<h1>N-ai fost cuminte," + prenume + " " + nume + " așa că te-am blocat! </h1>",
    })
    console.log("trimis mail");
}


router.post("/login", function(req, res) {
    var formular = formidable.IncomingForm()
        //console.log("am intrat pe login", req.body.username);
    var campuriText = req.body;
    //console.log(campuriText.parola)
    var parolaCriptata = mysql.escape(crypto.scryptSync(campuriText.parola, parolaServer, 32).toString("base64"));
    campuriText.username = mysql.escape(campuriText.username)
        //console.log(campuriText.username, parolaCriptata)
    var comanda = `select * from utilizatori where username=${campuriText.username} and parola=${parolaCriptata}`;
    conexiune.query(comanda, function(err, rez, campuri) {
        console.log(comanda, rez);
        if (rez && rez.length == 1) {
            if (rez[0].blocat == 0) {
                req.session.utilizator = rez[0]
                req.session.save()
                res.render("index", { utilizator: req.session.utilizator });
            } else {
                res.render('error', { message: "Esti blocat!" })
            }
        } else {
            res.render("index");
        }
    });
    /*
    formular.parse(req, function(err, campuriText, campuriFisier) { //se executa dupa ce a fost primit formularul si parsat
       
    });
    */
});