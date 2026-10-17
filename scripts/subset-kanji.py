"""Builds one small font holding just the given characters, from @fontsource's pieces of it.

Usage: subset-kanji.py OUT.woff2 CHARS PIECE.woff2...
The pieces are the files whose unicode ranges cover CHARS. Each glyph is copied with its outline
and its horizontal and vertical metrics (the kanji are set vertically) into a copy of the first
piece, which is then cut down to just those glyphs.
"""
import sys

from fontTools.subset import Options, Subsetter
from fontTools.ttLib import TTFont

out, chars, pieces = sys.argv[1], sys.argv[2], sys.argv[3:]
wanted = {ord(c) for c in chars}

fonts = [TTFont(p) for p in pieces]
base = fonts[0]
glyf, hmtx = base["glyf"], base["hmtx"]
vmtx = base["vmtx"] if "vmtx" in base else None
order = list(base.getGlyphOrder())
cmap = {}
for table in base["cmap"].tables:
    if table.isUnicode():
        cmap.update(table.cmap)

for font in fonts[1:]:
    their = font.getBestCmap()
    for cp in wanted:
        if cp in cmap or cp not in their:
            continue
        name = their[cp]
        glyph = font["glyf"][name]
        if glyph.isComposite():
            glyph.expand(font["glyf"])
            # Components would have to come too; draw them into one simple glyph instead.
            from fontTools.pens.recordingPen import DecomposingRecordingPen
            from fontTools.pens.ttGlyphPen import TTGlyphPen

            rec = DecomposingRecordingPen(font.getGlyphSet())
            font.getGlyphSet()[name].draw(rec)
            pen = TTGlyphPen(None)
            rec.replay(pen)
            glyph = pen.glyph()
        new = f"u{cp:04X}"
        glyf.glyphs[new] = glyph
        order.append(new)
        hmtx.metrics[new] = font["hmtx"].metrics[name]
        if vmtx is not None and "vmtx" in font:
            vmtx.metrics[new] = font["vmtx"].metrics[name]
        cmap[cp] = new

base.setGlyphOrder(order)
glyf.glyphOrder = order
for table in base["cmap"].tables:
    if table.isUnicode():
        table.cmap = {cp: g for cp, g in cmap.items() if table.format != 4 or cp <= 0xFFFF}

missing = [chr(cp) for cp in wanted if cp not in cmap]
if missing:
    print("missing:", "".join(missing), file=sys.stderr)

options = Options()
options.flavor = "woff2"
options.layout_features = ["*"]
options.name_IDs = ["*"]
options.notdef_outline = True
subsetter = Subsetter(options)
subsetter.populate(unicodes=wanted & set(cmap))
subsetter.subset(base)
base.flavor = "woff2"
base.save(out)
print(f"{len(wanted & set(cmap))} glyphs")
