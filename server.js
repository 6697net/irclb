var tls = require('tls');
var fs = require('fs');
var dns = require('dns');
var commandos = require('commandos');
var cliArgs = commandos.parse(process.argv.join(" "));
var config = require( (cliArgs.config||'./config.json') );
function reverseLookup(ip, callback) {
    dns.reverse(ip, function (err, domains) {
        if (err != null)
        {
            return callback(err, ip);
        }
        domains.forEach(function (domain) {
            return callback(null, (domain||ip));
        });
        return callback(null, ip);
    });
}

Array.prototype.random = function () {
    return this[Math.floor((Math.random() * this.length))];
}

var options = {
    key: fs.readFileSync(config.listener.ssl.key),
    cert: fs.readFileSync(config.listener.ssl.cert)
};

function doConnect(socket, userStr, nickStr, capStr) {
    var nick = nickStr.toString().match(/^NICK (.*?)(\s|$)/i)[1];

    const options = {
        rejectUnauthorized: false
    };

    var serverInfo = config.servers.random();
    var csocket = tls.connect(serverInfo.port, serverInfo.host, options, () => {
        console.log('client connected', csocket.authorized ? 'authorized' : 'unauthorized');
        socket.write(":irc.lb NOTICE * :You are now connected to the IRCd @ " + serverInfo.host + ":" + serverInfo.port + "\r\n");
        reverseLookup(socket.remoteAddress, function (err, cHost) {
            if(cliArgs.debug)
            {
                socket.write(":irc.lb NOTICE * :Found your host " + cHost + ".\r\n");
            }
            csocket.write("WEBIRC " + serverInfo.webirc.password + " " + serverInfo.webirc.username + " " + cHost + " " + socket.remoteAddress + "\r\n");
            if (capStr) {
                csocket.write(capStr + "\r\n");
            }
            csocket.write(nickStr + "\r\n");
            csocket.write(userStr + "\r\n");
        });
    });
    csocket.setEncoding('utf8');
    csocket.on('data', (data) => {
        if(cliArgs.debug) { 
            data.toString().split("\r\n").forEach(function(msg){
                console.log(msg);
            });
        }
        socket.write(data);
    });
    socket.on('data', (data) => {
        if(cliArgs.debug) { 
            data.toString().split("\r\n").forEach(function(msg){
                console.log(msg);
            });
        }
        csocket.write(data);
    });

    csocket.on('error', (err) => {
        console.log(err);
    })

    csocket.on('end', () => {
        socket.destroy();
        console.log('Ended')
    });

}

var server = tls.createServer(options, function (socket) {
    var string_user;
    var string_nick;
    var string_cap;
    var connected;
    socket.write(":irc.lb NOTICE * :You have connected to an irclb instance for " + config.network.name + " at " + config.network.host + ". Please wait while we connect you to the next available IRC daemon.\r\n");
    if(cliArgs.debug)
    {
        socket.write(":irc.lb NOTICE * :This daemon is running debug mode, all commands, private messages, channel messages, and passwords are being output to the terminal.\r\n");
    }
    socket.on('data', function (data) {
        data.toString().split("\r\n").forEach(function (message) {
            message.replace(/\r\n$/, '');
            if (message.match(/^CAP /i)) {
                string_cap = message;
            }
            if (message.match(/^USER /i)) {
                string_user = message;
            }
            if (message.match(/^NICK /i)) {
                string_nick = message;
            }
            if (message.match(/^LB\-INFO[\s$]/i)) {
                socket.write(":irc.lb NOTICE * :string_cap: " + string_cap + "\r\n");
                socket.write(":irc.lb NOTICE * :string_nick: " + string_nick + "\r\n");
                socket.write(":irc.lb NOTICE * :string_user: " + string_user + "\r\n");
            }
            if (!connected) {
                if (string_nick && string_user) {
                    connected = true;
                    doConnect(socket, string_user, string_nick, string_cap);
                }
            }
        });
    });

    socket.on('error', function(err){
        console.log(err);
    });

    // Let us know when the transmission is over
    socket.on('end', function () {
        console.log('EOT (End Of Transmission)');
    });
});

// Start listening on a specific port and address
server.listen(config.listener.port, config.listener.address, function () {
    console.log("I'm listening at %s, on port %s", config.listener.address, config.listener.port);
});

// When an error occurs, show it.
server.on('error', function (error) {
    console.error(error);
    // Close the connection after the error occurred.
    //server.destroy();
});