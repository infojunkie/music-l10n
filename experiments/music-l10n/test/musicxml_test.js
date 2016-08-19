import { strictEqual, doesNotThrow } from 'assert';
import fs from 'fs';
import { parseString } from 'xml2js';

import '../lib';
import { musicXmlToJs } from '../lib/musicxml.js';

describe('MusicXML', () => {

  it('uses xml2js successfully', () => {
    fs.readFile('test/test.xml', 'utf8', function(err, xml) {
      parseString(xml, function (err, result) {
        strictEqual(err, null);
        console.dir(result);
      });
    });
  });

  it('uses musicXmlToJs successfully', () => {
    fs.readFile('test/test.xml', 'utf8', function(err, xml) {
      doesNotThrow(musicXmlToJs(xml));
    });
  });

});
