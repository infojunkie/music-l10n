#!/usr/bin/python
import lxml.etree as ET
import sys

xml = ET.parse(sys.argv[1])
if xml.getroot().tag != 'score-partwise':
    sys.exit('Root element <score-partwise> not found: exiting.')
mma = open(sys.argv[1].replace('.xml', '.mma'), 'w')

#
# Find and output title as comment
# SoloVoice is always TenorSax
# For each measure in first part:
# - Find and output tempo if any
# - Find and output groove if any
# - For each note:
#   - Find and output chord
#   - Accumulate note
# - Output notes
#

def outputMeasure(measure):
    mma.write('measure\n\n')


mma.write('// %s\n\n' % (xml.find('./work/work-title').text))
mma.write('Solo Voice TenorSax\n\n')
for measure in xml.findall('./part[1]/measure'):
    outputMeasure(measure)
