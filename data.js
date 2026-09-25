export const VERSION='1.0.1';
// Damage is deliberately narrow and readable; abilities, not inflated stats, drive danger.
const enemy=(name,glyph,floor,hp,atk,role,tip,color='#d89584')=>({name,glyph,floor,hp,atk,role,tip,color});
export const ENEMIES={
 rat:enemy('灰牙鼠','鼠',1,10,3,'群れ','仲間が隣接すると攻撃+2。通路で一体ずつ。'),
 shield:enemy('錆盾兵','盾',1,18,4,'正面防御','向いている方向からの近接を軽減。攻撃後は1手、盾が下がる。側面・毒・矢も有効。'),
 boar:enemy('突角獣','角',2,19,5,'突進','赤い直線を1手予告して突進。横へ避けると突進後に隙ができる。'),
 archer:enemy('灰弓手','弓',2,12,4,'射撃','橙の射線を1手予告。遮蔽物や横移動で避ける。'),
 moth:enemy('灯喰い蛾','蛾',3,12,3,'高速移動','偶数手は2マス移動。攻撃は1回。鈍足で接近を遅らせる。'),
 fungus:enemy('爆ぜ茸','茸',4,10,2,'死亡時爆発','倒した次の手の終了時、周囲1マスに8ダメージ。敵も巻き込む。'),
 lizard:enemy('毒針蜥蜴','毒',6,16,3,'毒','近接で4手の毒。毎手1ダメージ。解毒や遠距離で対処。'),
 bell:enemy('眠り鐘','眠',6,15,2,'睡眠','紫の周囲2マスを予告。波を受けると次の1手を失う。被弾で解除、再睡眠に耐性。','#b5a4e0'),
 hunter:enemy('退き撃ちの狩人','狩',7,17,4,'後退射撃','近づくと後退。柱を挟んで接近、鈍足や眠りを使う。'),
 monk:enemy('封具僧','封',8,16,2,'道具封印','周囲3マスを予告し3手の道具封印。詠唱中に沈黙・攻撃、または範囲外へ。','#b5a4e0'),
 healer:enemy('縫命師','癒',8,15,2,'回復支援','4マス以内の傷ついた仲間を6回復。先に倒すか、仲間を範囲から引き離す。','#91c7b4'),
 caller:enemy('呼び子','呼',9,16,2,'召喚','1手予告後に灰牙鼠を呼ぶ。最大3回。召喚獣に討伐報酬はない。','#b5a4e0'),
 chain:enemy('鎖引き','鎖',11,21,4,'引き寄せ','直線を予告し2マス引き寄せる。着地点の敵・罠も確認。'),
 wind:enemy('風圧像','風',11,23,3,'吹き飛ばし','扇形を予告して2マス押し出す。後ろに罠や炎があると危険。'),
 drummer:enemy('戦鼓鬼','鼓',12,20,3,'範囲強化','周囲3マスの敵の攻撃+2。金の輪が支援範囲。本体を優先。','#e6be75'),
 wall:enemy('壁渡り','壁',12,18,4,'壁際出現','壁へ潜り、プレイヤー近くの壁際を1手予告して出現。出現直後は攻撃しない。'),
 mirror:enemy('鏡殻蟲','鏡',13,22,4,'射撃反射','◇表示中は矢・槍・貫通杖を反射。反射は2手ごとに切り替わる。近接・爆風は有効。','#9ccee0'),
 sprout:enemy('育つ瘴芽','芽',14,14,2,'成長・毒床','接敵後6手で成長。周囲に毒床を広げる。早めに倒すか区域から離れる。','#91c7b4'),
 fleeing:enemy('逃げ火','火',16,17,3,'逃走・炎床','逃げながら3手残る炎を落とす。踏むと3ダメージ。追いすぎず射撃で対処。','#ef9a63'),
 executioner:enemy('処刑鎧','刑',17,32,6,'重装・大振り','近接を2軽減。周囲2マスの処刑を2手予告し14ダメージ。逃げ道を先に確保。','#ef827e'),
 twins:enemy('双鐘の番人','双',10,68,6,'中ボス','突進と鐘の支援。先に眠り鐘を壊すと戦場が安全になる。','#f0c57d'),
 warden:enemy('鎖庭の主','庭',15,90,7,'中ボス','鎖で引き寄せ、次に床を焼く。柱で鎖を遮り、予告された床から逃れる。','#f0c57d'),
 king:enemy('残灯王','王',20,132,7,'最終ボス','体力で3段階。十字の灼熱、召喚、周囲攻撃を順に使う。支援役を放置しない。','#f0c57d')
};
export const ITEMS={
 heal:{name:'回復薬',glyph:'✚',desc:'生命を24回復。',kind:'self'},
 antidote:{name:'解毒薬',glyph:'滴',desc:'毒を消し生命を6回復。',kind:'self'},
 remedy:{name:'万能薬',glyph:'清',desc:'毒・睡眠・封印を解除し生命を12回復。',kind:'self'},
 food:{name:'保存食',glyph:'糧',desc:'満腹度を50回復。',kind:'self'},
 ration:{name:'非常食',glyph:'食',desc:'満腹度を25回復。',kind:'self'},
 arrows:{name:'矢束',glyph:'矢',desc:'矢を8本補充。装填は1手。',kind:'self'},
 spear:{name:'投げ槍',glyph:'槍',desc:'射程5、12ダメージ。敵が矢を反射する状態なら危険。',kind:'enemy',range:5},
 wand:{name:'貫通の杖',glyph:'杖',desc:'同じ直線の敵すべてに10ダメージ。残り回数を持つ。',kind:'enemy',range:6,charges:3},
 slow:{name:'鈍足瓶',glyph:'鈍',desc:'射程5。対象周囲1マスを5手鈍足にする。',kind:'enemy',range:5},
 sleep:{name:'眠り粉',glyph:'眠',desc:'射程4。対象周囲1マスを3手眠らせる。被弾で解除。ボスには1手。',kind:'enemy',range:4},
 silence:{name:'沈黙の札',glyph:'黙',desc:'射程5。対象の特殊能力と予告を4手停止。ボスには2手。',kind:'enemy',range:5},
 smoke:{name:'煙幕玉',glyph:'煙',desc:'足元の周囲1マスに5手の煙。敵味方の射線を遮る。',kind:'self'},
 ice:{name:'氷壁の札',glyph:'氷',desc:'隣の空き床に5手の障壁。自分の退路にも注意。',kind:'tile',range:1},
 fire:{name:'火炎瓶',glyph:'炎',desc:'射程5。周囲1マスに6ダメージと4手の炎。自分も巻き込む。',kind:'tile',range:5},
 blink:{name:'転移の石',glyph:'転',desc:'見える空き床へ転移。射程4。着地点の罠にも注意。',kind:'tile',range:4},
 swap:{name:'入れ替えの杖',glyph:'換',desc:'射程5の敵と位置を交換。残り回数を持つ。',kind:'enemy',range:5,charges:2},
 thunder:{name:'過負荷の雷杖',glyph:'雷',desc:'見える敵すべてに20ダメージ。使用で壊れる。',kind:'self'},
 fury:{name:'背水の薬',glyph:'猛',desc:'6手の間、近接+5。その後3手は受けるダメージ+2。',kind:'self'},
 scout:{name:'索敵の札',glyph:'索',desc:'地形・階段を記憶し、8手の間すべての敵の位置を表示。壁越しの攻撃は不可。',kind:'self'},
 detect:{name:'罠見の粉',glyph:'眼',desc:'この階の罠をすべて発見。',kind:'self'}
};
export const WEAPONS={sword:{name:'旅の刀',atk:7,desc:'扱いやすい刀。'},spear:{name:'間合いの槍',atk:6,desc:'直線2マスまで近接攻撃。射撃を選び隣接外の敵を狙うと、矢を使わず突ける。'},dagger:{name:'毒刻の短剣',atk:5,desc:'近接で毒を4手付与。'},bow:{name:'狩人の弓',atk:4,desc:'矢の威力+3、射程+1。'}};
export const CHARMS={none:{name:'護符なし',desc:'追加効果なし。'},venom:{name:'毒守り',desc:'受ける毒の持続を2手に短縮。'},anchor:{name:'定めの護符',desc:'吹き飛ばし・引き寄せを防ぐ。'},ember:{name:'火守り',desc:'炎床のダメージを1に軽減。'}};
export const SKILLS={assault:{name:'強襲',desc:'1段階ごとに近接+1。予告中・硬直中の敵にはさらに+2。'},guard:{name:'守勢',desc:'防御中の軽減が段階ごとに+1。防御後の次の近接に段階×2を加算。'},venom:{name:'呪毒',desc:'状態異常の敵への攻撃を段階ごとに+1。敵への毒・鈍足・沈黙の持続+段階。'},ranged:{name:'狙撃',desc:'矢・投げ槍・貫通杖の威力を段階ごとに+2。'},tools:{name:'道具術',desc:'回復薬の回復を段階ごとに+3。2段階から杖の消費が2回に1回。3段階で雷・火炎瓶の威力+4。'}};
export const STATUS={poison:'毒：手の終了時に1ダメージ。',sleep:'睡眠：次の行動が待機になる。被弾で解除、解除後は4手の睡眠耐性。',seal:'封印：道具使用不可。移動・攻撃・射撃・置くは可能。',slow:'鈍足：偶数手に行動できない。',silence:'沈黙：特殊能力と予告が停止。',fury:'背水：近接+5。終了後に疲労。',weak:'疲労：受けるダメージ+2。',sleepImmune:'睡眠耐性：睡眠の再付与を防ぐ。',scout:'索敵：すべての敵の位置を表示。'};
export const phase=f=>f<=5?'崩れた関所':f<=10?'菌床の祭壇':f<=15?'反響の牢域':f<20?'消灯の聖域':'深淵の灯炉';
