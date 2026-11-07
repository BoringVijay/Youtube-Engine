import json, re
s = open('/home/claude/panel/src.html').read()
icons = json.load(open('/tmp/icons.json'))
used = {a or b for a, b in re.findall(r'ic\("([a-z]+)"\)|data-i="([a-z]+)"', s)}
missing = used - set(icons)
assert not missing, missing
s = s.replace('/*__ICONS__*/{}', json.dumps(icons, separators=(',', ':')))
open('/home/claude/panel/index.html', 'w').write(s)
open('/tmp/ptest/index.html', 'w').write(s.replace('<script>', '<script src="mock.js"></script>\n<script>', 1))
js = s[s.index('<script>') + 8:s.rindex('</script>')]
open('/tmp/panel.js', 'w').write(js)
print(len(s), "bytes,", len(used), "icons")
