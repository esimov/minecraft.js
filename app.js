var static = require('node-static'),
    http = require('http');

var port = 3000;
var file = new static.Server('./');

http.createServer(function(request, response) {
    request.addListener('end', function() {
        file.serve(request, response)
    }).resume();
}).listen(port, function() {
        console.log("Server started on port: " + port);
});


