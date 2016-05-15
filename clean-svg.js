var xml2js = require('xml2js');
var fs = require('fs');
var _ = require('lodash');

var spritesPath = './assets/sprite';

var filenames = fs.readdirSync(spritesPath);
console.log('cleaning', filenames);

filenames.forEach(function(filename) {
  fs.readFile(spritesPath + '/' + filename, 'utf8', function (err, data) {
    if (err) return console.log(err);

    xml2js.parseString(data, function(err, result) {
      delete result.svg.$.width;
      delete result.svg.$.height;

      var builder = new xml2js.Builder();
      var xmlStr = builder.buildObject(result);

      fs.writeFile('./src/app/svg/' + filename.replace('mrdario_',''), xmlStr);
    })
  });
});
