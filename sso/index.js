const express = require("express");
const fs = require("fs");
const https = require("https");
const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const { URL } = require("url");

const PORT = process.env.PORT || 9900;

const prvKey = fs.readFileSync("jwt/private.key");
const pubKey = fs.readFileSync("jwt/public.key");

const users = {
	"test": "1234"
};

let app = express();

app.use(cookieParser());
app.use(bodyParser.json());

app.get("/debug", (req, res) => {
	res.send(req.params);
	// headers, client, params, query
});

app.get("/", (req, res) => {
	if (req.cookies.jwt) {
		if (req.query.redirect) {
			let redir = new URL(req.query.redirect);
			redir.searchParams.append("jwt", req.cookies.jwt);
			res.redirect(redir);
		} else {
			res.send("Estás logueado, mamón!");
		}
	} else {
		res.sendFile(__dirname + "/index.html");	
	}
});

app.post("/login", (req, res) => {
	// TODO: HOST DEBE SER EL MISMO!!!!!!!! NO CORS!
	console.log("Login attempt. " + JSON.stringify(req.body));
	if (!users[req.body.username]) {
		res.status(401).json({
			error: "Incorrect user"
		});
	} else if (users[req.body.username] !== req.body.password) {
		res.status(401).json({
			error: "Incorrect password"
		});
	} else {
		jwt.sign({
			username: req.body.username
		}, { key: prvKey, passphrase: "1234" }, { algorithm: "RS256" }, function(err, token) {
			if (err) {
				console.error(err);
				res.status(500).json({
					error: "Unknown error"
				});
			} else {
				res.cookie("jwt", token);
				res.json({
					token
				});
			}
		});
	}
});
app.post("/verify", (req, res) => {
	jwt.verify(req.body.token, pubKey, { algorithm: "RS256" }, function(err, decoded) {
		if (err) {
			console.error(err);
			res.status(401);
			res.send();
		} else {
			res.json(decoded);
		}
	});
});

https.createServer({
	key: fs.readFileSync("https/server.key"),
	cert: fs.readFileSync("https/server.crt")
}, app)
.listen(PORT, function() {
	console.log("Listening on port " + PORT);
});