import xml2js from 'xml2js';

export function musicXmlToJs(xml) {
    xml2js.parseString(xml, function(err, jso) {
      if (err) throw err;
      console.log(jso);
    });
}
