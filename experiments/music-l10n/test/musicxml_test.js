import { strictEqual } from 'assert';
import fs from 'fs';
import { parseString } from 'xml2js';

describe('MusicXML', () => {

  it('uses xml2js successfully', () => {
    fs.readFile('test/test.xml', 'utf8', function(err, xml) {
      parseString(xml, function (err, result) {
        strictEqual(err, null);
        console.dir(result);
      });
    });
  });

});
