# madoromi style guide

Which colour each thing is drawn in. The names are the same in every flavour; see `madoromi.json` for their values.

## paper 紙

| use | colour | |
| --- | --- | --- |
| background | kami 紙 |  |
| secondary panes: sidebars, panels, floating windows | hyōshi 表紙 |  |
| outer panes: title bar, status bar, tab strip | chitsu 帙 |  |
| surfaces: hovered and selected items, inputs, borders | nijimi 0 滲み, nijimi 1 滲み, nijimi 2 滲み |  |
| overlays: placeholders, disabled text, scrollbars | kasure 0 掠れ, kasure 1 掠れ, kasure 2 掠れ |  |

## ink 墨

| use | colour | |
| --- | --- | --- |
| body text, headlines | sumi 墨 |  |
| sub-headlines, labels, secondary text | usuzumi 1 薄墨, usuzumi 0 薄墨 |  |
| subtle text | kasure 2 掠れ |  |
| text on an accent | kami 紙 |  |
| accent: focus, active items, tags, pills | fuji 藤 |  |
| links, urls | sora 空 |  |
| success | wakaba 若葉 |  |
| warnings | yamabuki 山吹 |  |
| errors | beni 紅 |  |
| information | sora 空 |  |
| hints | tokiwa 常磐 |  |
| selection | nijimi 2 滲み | at 55–60% opacity |
| cursor | sakura 桜 | kami under it |

## code 符

| use | colour | |
| --- | --- | --- |
| keywords, storage | fuji 藤 |  |
| strings | wakaba 若葉 |  |
| escape sequences, regular expressions | botan 牡丹 |  |
| characters | tokiwa 常磐 |  |
| numbers, constants, booleans | kaki 柿 |  |
| comments | kasure 2 掠れ | italic |
| operators | sora 空 |  |
| braces, delimiters | usuzumi 0 薄墨 |  |
| functions, methods | ai 藍 |  |
| built-ins | beni 紅 |  |
| self, this | beni 紅 | italic |
| parameters | akane 茜 | italic |
| properties, fields, keys | ruri 瑠璃 |  |
| types, classes, interfaces, enums | yamabuki 山吹 |  |
| enum members | tokiwa 常磐 |  |
| namespaces, modules | kikyō 桔梗 |  |
| macros, preprocessor | tokiwa 常磐 |  |
| decorators, annotations | nadeshiko 撫子 |  |
| tags | botan 牡丹 |  |
| attributes | yamabuki 山吹 |  |
| labels | sakura 桜 |  |
| variables, plain text | sumi 墨 |  |

## prose 文

| use | colour | |
| --- | --- | --- |
| headings | fuji 藤 | bold |
| links | sora 空 | underlined |
| inline code, code blocks | wakaba 若葉 |  |
| quotes | kasure 2 掠れ | italic |
| list markers | kaki 柿 |  |

## editor 筆

| use | colour | |
| --- | --- | --- |
| cursor | sakura 桜 |  |
| cursor line | nijimi 0 滲み | at 45% opacity |
| line numbers | nijimi 2 滲み |  |
| active line number | fuji 藤 |  |
| search matches | kaki 柿 | 35% for the current one, 18% for the rest |
| matching bracket | nijimi 2 滲み, kasure 0 掠れ | 30% fill, solid border |
| indent guides, active | nijimi 0 滲み, nijimi 2 滲み |  |
| whitespace | nijimi 1 滲み |  |
| inlay hints | kasure 1 掠れ | on nijimi 0 at 50% |
| rainbow brackets | fuji 藤, ai 藍, yamabuki 山吹, wakaba 若葉, botan 牡丹, sora 空 |  |

## diff 差

| use | colour | |
| --- | --- | --- |
| added | wakaba 若葉 | 10% on lines, 18% on text |
| changed | ai 藍 | 12% on lines, 28% on text |
| modified (gutter) | yamabuki 山吹 |  |
| deleted | beni 紅 | 10% on lines, 18% on text |
| conflicts | fuji 藤 |  |

## terminal 端

| use | colour | |
| --- | --- | --- |
| background | kami 紙 |  |
| foreground | sumi 墨 |  |
| cursor, cursor text | sakura 桜, kami 紙 |  |
| selection | nijimi 2 滲み |  |
| active border, active tab | fuji 藤 |  |
| inactive border | nijimi 1 滲み |  |
| bell | yamabuki 山吹 |  |
| tab bar | chitsu 帙 |  |

## ANSI colours

Bright colours are the same ink as their normal colour, read 0.06 further from the paper.

| | day (hiru) | night (yoru) |
| --- | --- | --- |
| 0 black | usuzumi 1 薄墨 | nijimi 1 滲み |
| 1 red | beni 紅 | beni 紅 |
| 2 green | wakaba 若葉 | wakaba 若葉 |
| 3 yellow | yamabuki 山吹 | yamabuki 山吹 |
| 4 blue | ai 藍 | ai 藍 |
| 5 magenta | botan 牡丹 | botan 牡丹 |
| 6 cyan | tokiwa 常磐 | tokiwa 常磐 |
| 7 white | nijimi 2 滲み | usuzumi 1 薄墨 |
| 8 bright black | usuzumi 0 薄墨 | nijimi 2 滲み |
| 9 bright red | beni 紅, stronger | beni 紅, stronger |
| 10 bright green | wakaba 若葉, stronger | wakaba 若葉, stronger |
| 11 bright yellow | yamabuki 山吹 | yamabuki 山吹, stronger |
| 12 bright blue | ai 藍, stronger | ai 藍, stronger |
| 13 bright magenta | botan 牡丹, stronger | botan 牡丹, stronger |
| 14 bright cyan | tokiwa 常磐, stronger | tokiwa 常磐, stronger |
| 15 bright white | nijimi 1 滲み | usuzumi 0 薄墨 |
