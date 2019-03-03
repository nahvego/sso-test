const express = require("express");
const fs = require("fs");
const https = require("https");
const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const { URL } = require("url");
const request = require("request");

const PORT = process.env.PORT || 8800;

const sso = "https://sso:9900";

let app = express();
app.use(cookieParser());
app.use(bodyParser.json());


// Comprueba credenciales!
app.use(function(req, res, next) {
	let cookie = req.cookies.jwt || req.query.jwt;
	if (cookie) {
		// Consulta
		process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;
		request({
			method: "post",
			body: {
				token: cookie
			},
			json: true,
			url: sso + "/verify"
		}, (err, reqRes, body) => {
			if (err) {
				console.error(err);
				res.status(500).end();
			} else {
				if (reqRes.statusCode >= 300) {
					if (reqRes.statusCode === 401) {
						res.clearCookie("jwt");
						res.clearCookie("userdata");
						delete req.cookies.jwt;
						delete req.cookies.userdata;
						next();
					} else {
						console.log(reqRes.statusCode);
						res.status(500).json({ error: "No se pudo conectar al servicio SSO" });
					}
				} else {
					res.cookie("jwt", cookie);
					res.cookie("userdata", body);
					req.cookies.jwt = cookie;
					req.cookies.userdata = body;
					next();
				}
			}
		});
	} else {
		console.log("Redirect!");
		let redir = new URL(sso);
		redir.searchParams.append("redirect", `https://${req.headers.host}${req.url}`);
		res.redirect(redir);
	}
});

app.get("/debug", (req, res) => {
	let obj = { ...req };
	delete obj._readableState;
	delete obj.readable;
	delete obj._events;
	delete obj._eventsCount;
	delete obj.socket;
	delete obj.connection;

	delete obj.rawHeaders;
	delete obj.rawTrailers;
	delete obj.trailers;
	delete obj.client;
	delete obj.res;
	res.json(obj);
});

app.get("/setcookie", (req, res) => {
	res.cookie("test", "hola", {
		httpOnly: true,
		secure: true
	});
	res.send();
});


app.get("/", (req, res) => {
	console.log(typeof(req.cookies.userdata.username));
	res.send(
		req.cookies.userdata ? `Logueado como ${req.cookies.userdata.username}` : "No logueado"
	);
	//res.sendFile(__dirname + "/index.html");	
});

https.createServer({
	key: fs.readFileSync("https/server.key"),
	cert: fs.readFileSync("https/server.crt")
}, app)
.listen(PORT, function() {
	console.log("Listening on port " + PORT);
});