// Coast footer band — a 3:1 crop of a wave-on-rocks photo rendered offline as coloured
// glyph art (201x34 cells, glyph from luminance, colour from the cell's own hue with a
// cool bloom on the foam crest). Reference render: docs/coast-footer-reference.png.
// Do not hand-edit: the reference image and this data are generated together.

export const coastCols = 201;
export const coastRows = 34;
// cellHeight / cellWidth — the render grid is 0.6em advance by 1.2em line.
export const coastCellAspect = 2;
export const coastBackground = "#07070a";
export const coastAlt =
  "A photograph of ocean waves breaking on a rocky shore, seen from above, rendered as ~6800 coloured ASCII characters: teal and blue water with white foam across the middle, warm brown rocks and green tide pools in the lower right.";

// index -> hex, index 0 is the background (space cells)
export const coastIndexAlphabet =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz+/";
export const coastPalette: string[] = [
  "#07070a",
  "#7ac8da",
  "#6c583a",
  "#8ad0dc",
  "#35a5a8",
  "#128787",
  "#6abec0",
  "#71c1ee",
  "#c5e7f8",
  "#3da39e",
  "#82c9cb",
  "#7ac0ff",
  "#51422b",
  "#918877",
  "#66b6b2",
  "#5ab9ba",
  "#75c4ca",
  "#e0f2ff",
  "#4bacae",
  "#817557",
  "#ccd6c9",
  "#ddc192",
  "#4c8d93",
  "#67b6e1",
  "#46b1b6",
  "#92d4fe",
  "#319585",
  "#4caba2",
  "#1f9293",
  "#a5e4fc",
  "#50b3b9",
  "#57b1ad",
  "#5eaffc",
  "#71bbb6",
  "#67bacf",
  "#0e7977",
  "#0e6669",
  "#7bc0c1",
  "#bda172",
  "#9bdbfe",
  "#61ada6",
  "#83cfec",
  "#523310",
  "#2c9d9f",
  "#5c7670",
  "#277395",
  "#84c6ff",
  "#3eacac",
  "#8e6e3e",
  "#70b7ff",
  "#5ab6c7",
  "#e8f4ff",
  "#8cccff",
  "#64969f",
  "#4fa0d4",
  "#8c6325",
  "#7baaae",
  "#0c5350",
  "#4296bc",
  "#91b2c8",
  "#a68752",
  "#6b4717",
  "#6aa6c4",
  "#95daeb",
];

// one string per row, coastCols characters each
export const coastGlyphs: string[] = [
  "[_++~+?}11{{1(/|(///||trjft/tttjfrrxxxrjjjjjnvzczzXXXXYYccvczzXYUCCCLLLLJUUYYUJCJYJCCJJJUYXXXzzXYYUJCCUYXXYUJXcuxnvnxnuxtnvvzuunnnunXCQCzvcccczcYOOLXXcXXzczUYYUUCYXXzzvczXXczvYYJzncYUUXUYr/jvf/f)}(/ttt",
  "[{11)))111(/tfjxnuxrnxrxnuxjfffft//tfjjrxnxxuuvvuvvzYXzYUYYXzvvnnuczYJCCJUUUYYUUUYXUJJJYYJCJUUJCJJOZO0JQQCJYYXXzzJYYYzXZLJUzcvYCLCUUZ0YcvccczczXJQCJXXUUUJLQCCJJXzXXXXccvzUzzXvcczvnrnzYUYYx){}/jxj||trj1",
  "+-?[{1)(||/tffjrrrcurrxxnuvvczzvnccvunxnjffrxnnrxnuuuunnuvcXYJJUUzzvvXzvvcXzzXXXcvrrcXUZmOLwwOU0mOZUXUCmbbbpq0QmQQUzcYzmbZUYQq**mCUCJcuuvccXUCJLLJQLCUJUYCQOLLLJCUcXXzczczCzvcuczXYUuuxuuvXuj/{]][]~_1frr",
  ">~_-][{{((tft/tfjrnxrrxrjfxcuXUXYQ0Q0UvnrrxnnnuuvnxrxxxxjrnunxnccCUvnuunrrnnunczXJJLJccXCzzzzzcJJXYJJOpwmOmohZCLZOCzzUJQLvnxnYUCJvXUuccczzXXvczXzXXYYUUULQCZZQLJCCYzvYXzYUYvvvYYJJJzunrxnnuuuvuxf///|)){/",
  "<~~~~~+?[1)|tfttrnnnnunxxrrrjjrnunuzcccvcvnrrrrnxxxnuunnxnrjf|(|/ruunrtjjrrxnvXCJLOdmQZLXYUXJLCQ0JQ0QYYQC0LJCJUUXcvuunjf||||||tjxunjrrnxxrrrxxnXvxncvzJpapwobQYXJCCvvzLUYQ00Zqm0JYzvXuuxxrtjrrrnnnvvzrft|",
  ">~~~+~+_?][{{)(|tffjrnnuvvvvvunxnuvvunnnxnxxrfffjjtfjjftttt/|//|||(tttttfrxncUCLL0QJLJUXYCLJLhpaWCvxcbMmUcYYJqdQJYXzcunrjjfffffnvvvnrnncvcJYcuvzvzzC00mOZMbmawJLZdbkpOJUJOZd*MMd#dOmJYLCXXxjxtt({())//tfj",
  "-?]]][[}}1)(|tffttttfffjrrxnnnnnnxrxrjjrjjrxrjfrxnxfft//tfrrjxnuxxrjffttrxuXJ00wqqwdmOCUQLLwZQw0UurcXmb0zvzjjXmQOUUJCCYcvuxxxnuuucXzXUU0OQQJJUYcYYUzxYLUUhkwqdOCOdo#kkaaakk**bWaobhW*pd00mbmUcvuff([[?+[(",
  "?]][}{{1((/t|(|||/t/ttfjjjjjjjffrxxxrjrrnunnxrxnvvvvuuvvcccuvvvvcczXcunnxuUCLLJL0kkkbb#odpdhbqmUOQCZZCCLOm0wOCQ0Qmd*bOLJXUUXXzCLUYYzYQYzzcnzXcczLXLUUJQUucaaCJZQ0abQ&%$$8MM#b*$*0cxr?l]}/xuYCOZJcu/(1{]_<",
  '-][[}{}}{)(/ffffjrxnxxxxxxnuuvvvzXXXcvzzvuuuuuuvvzcczzXXzYXzXXYYUXXYUJJCZQJCYLQmwdpQmwdwQQwwmqq%hZZQ0dhh#oboq0LZ0OqkM*mJpd0Obkdwqq0XvvnnvvuvcnXCYUL0bWaZJpm%b0o8%$@B$B@@&MB$$$Y` `!>:",,~]?![(}tQ0cjj)|[_',
  '+_--?]}[}{)(/t/tfjxnuvvcuuuuuvvczzccccvvvvuvuvcvzzccvuvvvvvccvvzcUXYQLL0YXczUQwbhdwwoMdkpZmmkhdpqwo#WobpZUCzUdUUOqhobhb0wBmY0JJCLZZmpOCUJXcYXUYXYQZdZQm*M&o*qaOmoM$$B$BWoo$@u:  """  `"ll<^  !I .1ccUcnf|',
  "__??[{{111)(|/fttffftttfjrrxrrxnnnnuuuuuuuvuuuvvvcvccunvcvnnxnXzzzcc0ZmJxrYUUUJJzXQwmbddoahbdqbZkWo*W8hhab*#phk#h0qm0UJw0UCJYLaLcuzwa*Mbppkwpbbbkwkko*M@$$$$$@@@8@$$$$$$$$h:   .  ,         ^ il   -JOLUc",
  '?]][{}}}{1)11{)|//ftttfjjrxxnuvvcvuuvccvuxxrrxrrucuuucczjxxxtrvuu/(jnccxfrnczUJUqmwqYYJOO0LwqZJL0OmqOdqkq0J0qpppmOmqobwqZUnfuYxJpUQZqM$#M#Wabomk*MM8$$$$@$$$$$$$$k? "1Om%/                    ..     ?zXn',
  "-?[[}{}{))|///ttjfjfffrjrxxxrxnxuuzUUXzzucnxrxujrrrxxnrtxrjxt(tfxjxvvxnrnncvnjxY*kmCYJCJCYCJuvYJUXLkmqOdQXuxQ*qYJ0mqokpJrcCJwkcjLkpbmk&##b*$8&#oaaa8$$$$$$$$$$$$j                                     {cU",
  "<~+-]}11)())(ttfjrjjjjjrjrnvYXYUYCOm0YXUYUUJUYXvrjfrxxjfjt|/frrnvxvzYvjjrcr/xcY0qpqLmOYzJJ0kbpZUntxvnjvQ#ahkmJCZaMOOaaooha%&8$ahMkmopZOqM*m#$B$$$@$$$$$$&B%M%@$~                                   .i}}_]",
  'Il!i>>_][1111)/tjuvXzvnuYczXLCCCzzYLCYYJLmbhqLYJQLCLLQUXzvxnvxrrrxxnunrtt/(/rzCm0qmQzvuXLwZh##WqUcuuf)uUphpadzzwdOdOzYQdd#h$$$$&ha&&%hwkwwha%@$$$$$$$BM&#%$$$$1                .              "/?!li,.I  ',
  ".`,;lii+_-]?[)jf/fjuczzYJczzuvXvnnxt/rnjrvXzvccvXuuXcczzzzccvuvxxnnxxxrjffjrfjvJLOYunuxcYuYLmaBMaqmQUJQUma*ob0UYLo&%MmXa##o&#a@$$@@@%%$$$%&&M@$$$$$$$$$$$$$$8_                 ^Q*bmZL|<            'l\"  ",
  "   ^;;<>i>+<>>_?](fuXUnnJCUCQJJUXXUCYxjruxnvr////jfjrrnvcvvnnxxnnxnuurrjrrjruXZbOOmpkQcUXUQOpqqqmYznXXJJJpaaZZ*WW$$$$@$%@$%%&#$$@$$$$$$$$$$$$$$$$@$$$$$@$Wf>^            '   `  |YX}t|?1/vu}!           .",
  ".'`:;^l<~~?]---?}{/))ftfffttzXuXzcXJQOzvuuvcnjfrrj//ttfrnuczuxrjrrt/tfxnxuvXJZ0Zqo*8kqbMM0XXXXUcZwLCYzJYChCCOMkbo%B$&W@$$&$&h8%$%W$$$$$$$$$$$$$$$$$$$$@$O  ~              \"+<'`^  ;~){1(|u/{jn]l,<+?i    ",
  '  . I:,:i!>+[}_+-?_?[][)[[]{t/ncCvvuLqUzczXCJXzczujtfjjrrxnuvccvvunxxnuvxxxvYXUQOqqkhppdbUrXCZZ0aOrXXJmQQwdpa888W$$$8*MW$$%$BM8M#pW$@$$$$$$$$$$$$$$$$$$$,      l:l}[[i `l:>?}-_~!!11]~[x/-:<f/t-`   i+"  ',
  "  ',;I!:\"IlI:iii<<__-?_{][{[/x|jnfxncXCQmLXzzzYzYLCUzvcXzccvnnnuunxxjf/////juunjnJmp&#*kpddhhkhpbZpbdkhdkqJpo*kma$$%$$$$$$$$$$%MoZ&BWW@$$$$$$$$$$$$$$$$W,      .:?>ii<^  '     `   \": I:,`:!\"'-+l\"';+I !!",
  '^^^,,"^` . .``:~+(({11?{}{]]|}[){1(xfnvccxnrtjfnunnuzzcccuvvuuvuxxrrxjft)(rcXJwq0Qqkbbokk@%hk#%M8$$%aammbmUuwmCz0W8M$*baW@%$$$$$$%#$$@$$$$$$$$$$$$okZZ[^ ;?-I,!;           !>~l_[l"i?> \'   ,"!_~]i!<\'>+;>',
  '"">>:,""^I;";]v|]_[/}]{t{[t1??][{1)jXUunrt|/{[[)){{{1{))|())(tjnxttfYvjnvqkqhwpka@owk*o*#a#hkW$$%W&MbdwbqQYaqZqko#do%*h#8%&M$$$$$$$$$$$$$$$$az-;~. ^    I)>!]-;`":``:;:i"\'<:`I!";-!i![}{_!,i;!;;_, ~^ ;<-',
  "~>?>_-l<_[}_-(f[+++-}1(((((1[11|||trXOO00UcnrxvnrttxffrxzXczJLZpqpOJLCqaMZ0hwXxjbhZwMOQZzQwMWWBWMW8@%B8oMo&BM@8M@$%$B%B8&8@$a#$$%pwkw*8WC]],       ~t[;^+!'l\" .^ !_;   >;:\"I:;'`' >1i_~ `:l<I``\"         ",
  '^^^:!i!~>+~+_<[t)[[]?-+[}1[[{[[}?[1-?XQxucXvvzYXzuCho$%BBoook*o#W&%WW8$&#LcU|tX0*a8$&QUZ0w**aW8*&B%8WMk#Wodkqohk*a*o&8Mo*&$$q!~_;!)juj1(uj/l      ,l;>[:.!{<    ;.     I{}-f1ll][I i~:   "`\'.liI.`:"`^^  ',
  '\'"";I;I;!l;i_[{|}-1[[_]][}{/(t{{)cn(rXnjjmmXnvujvZCOwpdhhoO0o$@B$8%B8&$8MWhOQwaddpUwkkw8$@$&*oW%$$$$$$B$0ZkwZmbpdmbh*B&hwZ0h)   , \'l!\'"\',i_xt/nj[_jrU|i+rLu]l[_I   `~]?((/[+[j{",?ili-[~;^,^":I^;+,";.`:`',
  "`\";;;;ll!i><>><>>_++__+[{)(/nvfxj/tcJXUOahLUZm0YYa8dkYULwdqh&W88%8B&@$@$$$W88*bq*MMopba@M&8%M#Mo%$$$$8kwk8B#&&o#&&&WMW8$*d)` ^,:!_i  '`,     `(/f]\"+}_L?_UqUcffx}^\",  :.`+!~_!1__I'' .l}|_>il<i,,;.:  ^I:",
  "   .'\":,;Iliii><<>>++~_{{)1111//tjf/fxXzX1xYtYq*Z0Oa$WaMWWZaoW@*M&BB8@8M$$@%@$M88B8%%B@$BBB$$$$$#)]Lf   ]jk$@*aoM#aa*wpa8{,II:!il'l.       :-i!!~f/]u1x1,~jYQd>|n{?+()~_+!<t)Ill>(}~     ;__`^\",         ",
  '^^```":I!!I><~?+~<i><lII,:l~?}}(){-|YbLZ))LrnQphM#8$@$$%8$o#WB$B%$$$$$$@$$@$$$@8$@BB$$$$$$$$$oC)   \'  ` ,. [poOvZL+<?   ;;"`               ,uuXr/}Yx[n(Xf^!1)1(1/f-1n1f_!!}11j1-~>1(["     ;{1!l-]:^"!^` ',
  ":,,,,,IIl::Il!<i~?>i!lI>+?)|tt)nn|xOmJZbZdUZLOaM$@$$$$$$W##MM$@B$$$$$$$$$$$@$%W@$%BB$$$$$$h/                !i  ]     \": ^  '  i   ^      (Lzn{I` ,}-{-xX_fu1 ~_}j+[tnccn{}}l](({_I_{(-<-l:>]}]?])/1]){{[",
  ' .\'.`"I!i><_-~!<<+~_-_?1{///jxLawmqZUvCpZh%B$$%$%M$$$$$$$$$$W%WW8%$$$8B$M88&#oab@B$@$YjUwJ<^                 ^;    +|_i>_.   ^        ,{) -)[1   .  .;>">l??>  -<izJ)}))Yjuzt~<-|j]>~!+<:l,l!>~>]_{/j?:i>',
  "     '  `:I;><_-__[_i+ru||tnvCmmOmUuOLunk#BB&8%$$$@Mho$$$$$ommCvrXLwdkQZwpmqaB$$$$@b/n)_{ujzq}   !)l            '`I,:\"l<}l<l`.      ]ucYxl  \";~>~!;i>`,{{[j~ ,:_/I[trf:'(};~/|-  `:-ii>_I`_>^`!>^!+/x1<,`",
  ' \'`::,i~_ii?1{{{~~+1tjcUUcjvUvccc|cmOvz0LdW%8WkLz)?|1fn|xt?>tOLL)-t"<}}/CXXOLqwkmXJnjJOLXQ0kmw(zUC0h01uX)}}_]tt|nt}{<]f/tt{<|j/l   i_""   ` .II+!)ux/[!_(|c[[JOZQ|>[}|{}[_i"l(r)]i:I"!<>-~<>!!^ ,l.^l1[,l',
  '-?}{~>i_}+l~<_{//||rvCQXCxjr1[cn(jcnnxX0q#C0Y-"  .iiI;  .;iI>t(]-+]xCz|z0Yc|/j){{l~?(cYfOznXuXc"?c/vbZqwLnYJqka*0)1rfjfr1t< iIl}}i ^(-   \'![1cYCYnYL0|v)J0n,^;)t/|1}?lI+]1{}{)(t/|}<?_+]~}[_~~i<>ll[1{(?_',
  "<<~!!i>>><+-~?]-{1}{jUYuzu{1(uucYQ0zZbphqtI;    .^` :]  .:i; :-}{ffLuzJx|nj{_])?(}<i?[_'[{{fYYLv[^!{xnxLQLcuxuxjzQu00nn|)rf:  I' j|  ``I>,^? ,``l\"~~(}/UtfnfI^_}|t|))()))11))1)11}})[[/nf[/r[_?-~?{|; . ,",
];

// one string per row, each character indexes coastPalette via coastIndexAlphabet
export const coastColorIndices: string[] = [
  "5ZZZZZ55SS55SShSShhhSShl44hhhhh4h44lll4hhhh4lUFFFFFFF666FUVFFFF6GGGGGGGAG6G66GGAG6GAAGGbb6XXXXXXXbbbAAb666bGG6EVRVEVRVUl9VVE6EEeeeeRXA3AXEEEEXXEb33AXXXXXXXXbbbbbAbbXXXEEXXXEXEbbA6eXbbAbbbeMrurrrMMMrrrr",
  "5SSSSSSSSSShh44IIOIlIIlIIUl4h4hhhShhh444llllOOOOOOUF6FF666o6FVUIRIVF6GGGG6G666GGG6X6bAGbbbAAbGAAGA3333G33AAGb66X6GY66FofGG66EEbAAAbb33bEEEEXXXXbA1AAXXbbbAA3AAbAbXXXXXXXeXbXXXEEXXEeeeXbAbbeMQQMeerMMrrrM",
  "ZZ55SSSShhh994RRRlFUllllOOFUFooOlOOOOlll4hh4lll4llllllllOUF66GYYYoFVREEVVVEFEXXXEeRRE6b3/3A//3633336XGA/TTT//33/11G6E6XfdfGb3/Td3AbAGEeEEXXbbAAAAA3AAbbbbAA3AAAAAbXbXXXXXXAXXXeXXbbbEEeuuubueMQQQQQaaMrrr",
  "aZZZ555Shh999h999IIIlllll4lUUooooN7N1oOl44llllOOUlllllll44lOlllVVG6VRRRR99RRVREEXGGAAEE6AE66XXEAG66GG3//33/TT3AA33G6EGG11URRR6bAGEXGeEXEXXbXEXXXXXXXbbbAA3A//AAAAAbXEbbXbAbXXXbbGAAbEeeeeeuuuuuurrMrMMMMr",
  "ZZZZZZZZ5SSh9999IIIIIUIIIlll44lOUOUFUUUUUUlll44lllllOOOOll44hSSSQ9RRR9h99RRRRVXAGA3//3316bG6GAAA3G331Gb1G3AAAAbb6XEEVVR9QQQQQQQReeeRRReVeRRReReXEeeEEXA/T//TTAbbAAAXXXAGb3333//3GbXXbEEeee9eeeeuuuuuxurrM",
  "ZZZZZZZZZ5555SShh94llIIUUUUUUOOlOOUUOOlllOll4h4444hh444hhhhhShhSSQSQhhhhhlIVFGAAA3AGAGG6bG1G1T/TTGEeETTfYF66G//3AbbXEEeRRR9999ReeEEeReeEEEG6EVEXEXXG13/33TT/T/AA3TTT/3GGGffPdddPTT3fGb3AbbeeerrMQMMMrrrrr",
  "ZZ5555555SSShh94h9h4444lllllOOlOOllll44l44lll444lOl4hhhhh4ll4lIVII9944hhlIU6G33////T/3Ab3AA/31f1GVVEofP1oUolRof13bbAAAbXEEVVVeeeeEbXbbb3333AAbbXb6YFI61GATT//d3A3dTdddddddPqPPdqPPPqPPd33fd/buuurrMQQQZMM",
  "55555SSSSh99hSShhhhhhh4444444449lllll4llOOOOlllOUUUUOOUUUUFOUVVVEE66FUIIIUGG11GA3TdTTdTT///dd//b31A3fY111f7f3G111fdTd3AAbbbbbXAAbbbXG166XEeX6EEX161GAA1GEXTdAA331dP1ddppPPddqPpP3xuui2JJDcuxx33AuuMMMMQZa",
  "Z5555555SSh99999llIIllIIlIIUUUUUFo6oUUFoUOOOOOOUUUUUoFooF66F6666G666GGGG31GG6A33///1f/T/A3/////TT3333dTdTdPdf11717/dddfG/T33ddd///3bXEeeEEEEEe61YG13dPP3GPfdP1TddpTdPddTTTTTppxC0gzzgggg2mtzmDir33+rrMMMj",
  "ZZZZZ5555SSShhhh44lOOUUFUUOUUUUUFFFFFUUUUUOOOUUUFFUUUUOUUUUUUUFFF6661A11o6EEG3/TT///TTdT/3/3TTP///TdTdd/3G1oYqNY1fPPqkq7fdfb1YGGA33/T3AbG6XbbGY+Y1fdf1fqqPdP/T3/dPppdpPqqqqPuC00ggC00ggzz2C00zz0Cru+Y++rM",
  "ZZZ55SSSSSSShh4h4444hhh44lll99IIOOOOOOOOOOOOOOUUFFUFFUIUFUIOII6FFFUU133YIR6GGGGG661ffd//TTTdd/dfTTddddTTTddd/dddd1ff1YYf1YYYY1T1XeX/dTTTPPdfPPPPd/dPPqqqpppPpPPqqqpppHHHHHTv000g00g000000000g0zz000ixf1x+",
  "5555S555SSSS55Shhh4hhh444lllOUUUFUUUUUUUOlllllllUUUUUUOU4lllS4OOOhShOOUI9RVFF6GG/fff6bG331A//fYY113/f//T/3Y1/T//f33fdPfffYw4wolY/Y1ffddPPqPdddfdqqkqpkppqppppHHppPi0Cr//8r00000000000000000000gg00000i+++",
  "Z5555S5SSShhhhh4444444444llllIIlIUFYYoFFOUOlllO444lIIOlhll44hSh4l4lOOlllOIFUIlI6TdfY6GGGG6AGVE6GG61df/3d3bEe1T/bA3//TPPYwoNNBqsw1kkk7BkkqqPpqqdPPPPqppppppppppppr0000000000000000000000000000000000000Dxx",
  "aZZZ55SSShSSh999lIlRl4444lOF666G6G3f1o6Y6YYYY6FFl94llR949hSh9llIUIUooU444O4hIF61/Pf1ffY6GG3TT/3GI4IUIRF3dddPfYYfPP33PPdPPqqqdpqqBBkqk77BqqfqpdpppkppHHpPkqPqkqpi00000000000000000000000000000000000C2tttJ",
  "vaaaaaZ55SSSSS99RVEX6FIV6FF6AGAGFF61G66G1fdd/16G11G1G1G6FUIIUllllRRIVVR99hShR6Af1ff1FUUoNffdTTT/GFVV4SVYPd/dd6oBn7P7+YNkBnnpdPPPqqqqqkBkBkkBkqppHpqppqddddppqHM0000000000000000g00000000000000CyJ2C2ggz00",
  "vvvvaaaZZZ5Z5S99Q99eEX6bAEE6VEXEIIR9QRRRRFooUFFV6VR6FFFXX6EFFVUIRRVRRRRR999I99EY11oUIUIooOY1fdTddffNoY7YfTTdd1YsNqkPP7sknnWnnWBpqqqBBBpHpqkkkqpHpHHppHpHppppqi00000000000000000gxdd//xri000000000000C2C00",
  "000vaaZaaaZaaaZZZQ9eX6VVGGGA3GAGX6GG6IlRVVVFRQQQQ999RRVEEEeVVRRVVRRVVRRRRRRRE6fd13fPPNoYoY11////fYoIoYYYYqqqffdPdppppqpkqpBnWWqpdppppHHHqpHHpHHppkpkppknpkriv000000000000g000g00DxxiDDiDyccmz00000000000g",
  "vvvvavaZZZ55ZZZZ55QQQ999h9QQEEVXEEXG136FVVEFIR9RR9hh999RRVEEVeRRRR9h9RVVIVE6Gf1f/dPPPfPqP16oo6YF3f11G6GYYqNN7qkqPPddPqqppkkBnnnBnBpHHHHHHHHHHHHpppppppkp700i00000000000000C2zggg00C2JJJyycDJDcJ2C22m20000",
  "00v0avvaaaaZ55ZZZZZZZZZQZZZZQQREAVVVA/G6E66AG66E6V9999RRRRVVEEEEEEVIIVUFIIIF66G13//dPPPPkoIoN77NkW4ooYfNNBBBPqqPkppPqddkpqkPPkBWWWBkqpHHHHHHHHHHHHHpHpkkv000000CC2JJJ20g2C2mm22222JJm2JcymC2DDD2C00022C00",
  "00vvaaaavaaavaaaaaZZZZZ5ZZ5ZhIS9O9RVF6G1/16FF66XG1AG6FE66EEEVVVVVVVIl4hhhhhRUVVRVG3/TTTd/PPqkkkknnkBBBBBBBNqkBB7PdPkHHHpHHpHppPqBWnnBkkHHHHpHHHHHHHHHHpkv000000gCm2222C00g00000g000CC0zCCgCzgg222CCC2z022",
  "vvvvvvvv0v0vvvvaZhhSSSZ555Z5S55S55QI4VUUUlIR999RRRRVEFFEEVEEEEEEVVIII99hSSlUoYff7NfqqPqPPPqkqqBnBHpBnnWWnWswWWWsWBknpWWnkkqppHHHpqnppkpppHHHHHHHHpT83/iC0CmmCC2C0000000000022222JCCzt20C000ggz22m2z2C2JC2",
  "vvaavvvvvvvvv5US5Z5h55Sh55hS5Z555SSl6YOIl9QQ55Z5555555QQQQQQQ9RVV9996UlIOBBBk7BBkqqfqkkkkkBBqkPpqqkBBBBBnWsnnWWWWnBnnnnBBBqkqpHHHHpnkppppHHHq+i2iC0g0000CmzzmmCCCCCCCCCzCg2ggzzgztzzztmm2zC2zzgztg0zC0z2J",
  "aaZaZZaZZ55ZZh45ZaZZ5SSSShhS5SShhhh4F1111YFIlIUO4h4I44IIooOoYN7qfP7YNNBBB7NB7o4RkB7BBWN7o1fqkkkkkkqdPqPPPknBBkBnBBkpkBkkBqPPT8ppd8KHK888xiiv00000002DJCg2zgzC0CC0ztz0002CCgCCzggg0zmztz0ggC2Cggg000000000",
  "vvvvaaaZaZZZZZ5hS5555ZZ55S555555555ZZo1lUF6FFoYoFUYPPPPdPPdPPqkkkkkkkkkBk1+sh9+7kBkpkNY77nkkBkBnBnnqqkkqBnWnnkkqkBBBqBnBBBpH/zz2zztyyyttyyy2000000CCC2mCgzm20000Cg00000CJmmym22mmC0z2C000ggggzzzggzCggg00",
  "vvvvavaaaaaaZ5Sh5ZS55Z5555ShS455SOwS4sl44f7oOUO4UfYfffPPPdf1PqkkqBBkqkqqqqk7NBBWnnsBBBBkpkkBkBBkqPqpqkBBWnqB77BBkkkkqqkBBWWPD000g0gzzggggztyyyyym2yycy22yLcm2m2C000viJJyyym2myJCCtzzztJ2zgggggzgz2CgzgCgg",
  "vvvaaaaaaaaZZaZZaZZZZZZ55ShhlOhl4hhUYoY7qqNYff1YYqkBBsoNBnBBkkqkBBBBqqkpppkkkBnnnBkkBnWqBkBqqkkBkpHpBqPkkqkkqkBkqkkkPPqqqqrg0gggzzz00ggg00000gmyymC2ttLmtcLccyyyJCCC00CCC222tzmt2zgg0gztytzzz2zggzgg00CCC",
  "000vvvvvvaaaaaaZZaZZZZZ55SSSSShh9l4hhloooSIohYqq777qpnnBnBWBBkqnBqqqqqqPqpqqPqBkBnnnnnBpkqqpkpHHBjiNr000JuqpBkkkkBkqPfPddDgzzgzzzgzg0000000CJ22zzyymymcmgzyccL2ycDiiDDiJ2zzymC2z2mm200000gttgggg000000000",
  "vvvvvvvaaaaaaZ5ZZZaaZavvvvaaZ55hS5ZhsqNfSSNwwNqkkkkpBppBnkBBkqqqqpqpppqqHpkPppkkkkkkkkpppppHpkNr000g00g0gg0iPd3+7Niii000Czgg000000000000000gccccytcctymcygztJJymyymJymy22ztttym22zmmmg00000CJJ22mmCCC2CC0",
  "vvvvvvaaavvaaaaaZ5aaaaaaZZShhhSwwhw7nN7B7ks7N7nnpBkkpHHpkBnPqpqkpppppkkpppqqqkqqpkkqkpkpppdr00000000000000002200i00000CC0C00g00z000g000000DLccmCg0zttttyctycm022mD2myycccmmmztmymtztmm22m2C2JJJJJJDJJDDDJ",
  "0vvvvvaaaaaZZZaaaZZZZZZj5hhhww1knnWWswNn7PqkppBBBBppHHHHHHHHkkBPdPppkkPpqPPPPPTdkqqkkxDLKK2g00000000000000000gz00002y2z22C000g00000000gmm02mtm000g00ggzgzztt200t22ccmttmcyycD22tyyt22z22gzC22222JJDDDJC22",
  "00000v00vvaaaaZZZZ5ZaZwwhhhwsNBnWWsw7NwwqBBnnnnnnpd88HpHHHppKKKcyLLKT8KKLKKKTdpHpkqdDcmttcycLJ0002D2000000000000CC2CCCz2JC2zgg000000tyycyz00gzzzzzzzzggttty20CC2yCtttyCgmmC2yyJ00CCm22222C22gg22C2JDcD2CC",
  "0vvvvvaajaajjjjjZZZjwwsNNswsswsssjsf7w+1NBnnWWWNxJtmmmyycym2yLccmtygzttmcccLLK88KcLcyLLLcLLLLLmcccLLLJccJJJJJDyycymJ2JDyyytzmyy20002tgg000g0gzzzzJccytzttmcmmLLLLmzttmmmm22CzyyJJ2CCC222J22222C0C2gC2DJC2",
  "jjjjaaajjaaaajjwwMMw+NNsNwwwjjswjwswwwsWnBN7xiC00gzzzz00ggzzzymt22mcLcycLccyyymmmzztmccyLccccccCmcycLLLLLccLLLLLLJJcyDyymyz02C2mm20Cym000gztmccccccLLycmccygggmyyyJJ2CC22JJJJJJDyyJ2m22m2JJJ2222222DDDDJJ",
  "aaaaaaaaaaajajjjjjjjwN+wswjjjwsssNNsnnBBkM2C0000ggg0gm00ggzz0CtmmyyLyccyyyyJ2JDJDJ2zttzgtmmyccLctgzmyccLLLccycyycLcLLccymyyg00Cg0yy00CCC2ggm0Cggzg22mmycytyyzCiiDDiiiiiiiiiiiJJJJJJJJJDcDJDDJJJJ2JJDC0g0C",
];

// cool additive bloom (canvas screen blend) centred on the foam crest
export const coastGlow = {
  cx: 0.704,
  cy: 0.6029,
  radius: 0.3, // x canvas width
  strength: 0.28,
  falloff: 2.4, // alpha = strength * (1 - d/radius) ** falloff
  tint: "rgb(150 220 255)",
};

// glyph pool the decode sweep scrambles through
export const coastNoise =
  "@%#*+=~-:;Il!i><+?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$";
