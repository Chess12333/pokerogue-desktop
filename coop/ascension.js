// PRS 进阶（Ascension）for PokéRogue 1.12.2.6 —— 溟
// 十条规则累积生效：选 N 级 = 1..N 全部打开。单人 / 合作房间都走这里。
(function () {
  if (window.PRS_ASC) return;
  var KEY = 'prs-ascension-v1';
  function log() {
    try {
      var a = [];
      for (var i = 0; i < arguments.length; i++) a.push(typeof arguments[i] === 'string' ? arguments[i] : JSON.stringify(arguments[i]));
      console.log('PRS asc ' + a.join(' '));
    } catch (e) {}
  }
  var RULES = [
    [1, '迁徙之时', '有时出现不属于本地区的敌人；初始选择点数 10 → 8'],
    [2, '资源短缺', '区域回复与复活只恢复到 60%'],
    [3, '艰苦行动', '金钱获取降低 15%'],
    [4, '弱点击破', '敌人打在你被克制的属性上，伤害 +25%'],
    [5, '严格审核', '只能拥有五个宝可梦栏位（第六格空着）'],
    [6, '断绝制图', '移除地图道具，切换地区时不能再选择目的地'],
    [7, '稀缺', '稀有道具出现率下降'],
    [8, '训练严苛', '经验获取变为 80%'],
    [9, '墙立于此', '所有 Boss 血条段数 +1'],
    [10, '联合狩猎', '20 层之后每 5 层出现一个 Boss']
  ];
  var cfg = { level: 0 };
  try { var raw = JSON.parse(localStorage.getItem(KEY) || '{}'); if (typeof raw.level === 'number') cfg.level = raw.level; } catch (e) {}
  function lv() { return Math.max(0, Math.min(10, Number(cfg.level) || 0)); }
  function has(n) { return lv() >= n; }
  function saveCfg() { try { localStorage.setItem(KEY, JSON.stringify({ level: lv() })); } catch (e) {} }

  // A5：满员判定改读这里（游戏本体那一行已经换成 window.PRS_PARTY_MAX）
  window.PRS_PARTY_MAX = function () { return lv() >= 5 ? 5 : 6; };
  window.PRS_STARTER_MAX = function () { return lv() >= 5 ? 5 : 6; };
  window.PRS_POINTS = function () { return lv() >= 1 ? 8 : 10; };
  // A7：奖励稀有度阈值（1024 制）。默认 255/60/12；A7 起把 ULTRA 以上三档压到 36/6。
  window.PRS_T = function (i) {
    var rare = lv() >= 7;
    if (i === 2) return 255;
    if (i === 1) return rare ? 36 : 60;
    return rare ? 6 : 12;
  };
  var flags = { healPhase: false, faintPhase: false };
  var done = {};
  var curPhase = '';

  function protoWith(obj, name) {
    var p = obj && Object.getPrototypeOf(obj);
    while (p) { if (typeof p[name] === 'function') return p; p = Object.getPrototypeOf(p); }
    return null;
  }

  // ---- A2 回复/复活打折 ----
  function patchPokemon(any) {
    var hp = protoWith(any, 'heal');
    if (hp && !hp.__prsHeal) {
      hp.__prsHeal = true;
      var oheal = hp.heal;
      hp.heal = function (amount) {
        try {
          if (has(2) && amount > 0 && (flags.healPhase || flags.faintPhase)) amount = Math.max(1, Math.floor(amount * 0.6));
        } catch (e) {}
        return oheal.apply(this, arguments);
      };
      log('hook heal');
    }
    // ---- A4 弱点击破 ----
    var dm = protoWith(any, 'getAttackDamage');
    if (dm && !dm.__prsDmg) {
      dm.__prsDmg = true;
      var odm = dm.getAttackDamage;
      dm.getAttackDamage = function (o) {
        var r = odm.apply(this, arguments);
        try {
          if (has(4) && r && r.damage > 0 && !r.cancelled && o && o.source && o.move && !o.simulated) {
            var attackerIsEnemy = o.source.isPlayer && !o.source.isPlayer();
            var targetIsPlayer = this.isPlayer && this.isPlayer();
            if (attackerIsEnemy && targetIsPlayer) {
              var eff = this.getMoveEffectiveness(o.source, o.move, true, true, true);
              if (eff > 1) r.damage = Math.max(1, Math.floor(r.damage * 1.25));
            }
          }
        } catch (e) {}
        return r;
      };
      log('hook attack damage');
    }
  }

  function patchGameMode(s) {
    var gm = s && s.gameMode;
    if (!gm || gm.__prsBoss || typeof gm.isTrainerBoss !== 'function') return;
    gm.__prsBoss = true;
    var otb = gm.isTrainerBoss;
    gm.isTrainerBoss = function (wave) {
      try { if (has(10) && wave >= 20 && wave % 5 === 0 && wave % 10 !== 0) return true; } catch (e) {}
      return otb.apply(this, arguments);
    };
    log('hook trainer boss');
  }

  // ---- A1 迁徙之时：偶尔从别的地区抽怪 ----
  function patchArena(s) {
    if (done.arena) return;
    var ar = s.arena;
    if (!ar) return;
    var proto = Object.getPrototypeOf(ar);
    var orig = proto && proto.randomSpecies;
    if (typeof orig !== 'function') return;
    done.arena = true;
    var foreign = {};
    function poolOf(id) {
      if (Object.prototype.hasOwnProperty.call(foreign, id)) return foreign[id];
      try { var a = new (ar.constructor)(id); foreign[id] = (a && a.pokemonPool) ? a.pokemonPool : null; }
      catch (e) { foreign[id] = null; }
      return foreign[id];
    }
    proto.randomSpecies = function () {
      try {
        if (has(1) && Math.random() < 0.18) {
          var keep = this.pokemonPool;
          var swapped = false;
          for (var k = 0; k < 4 && !swapped; k++) {
            var id = Math.floor(Math.random() * 70);
            if (id === this.biomeId) continue;
            var fp = poolOf(id);
            if (fp) { this.pokemonPool = fp; swapped = true; }
          }
          if (swapped) {
            log('migrant encounter @wave ' + (window.PRS_SCENE && window.PRS_SCENE.currentBattle ? window.PRS_SCENE.currentBattle.waveIndex : '?'));
            try { return orig.apply(this, arguments); } finally { this.pokemonPool = keep; }
          }
        }
      } catch (e) { log('migrant error ' + (e && e.message)); }
      return orig.apply(this, arguments);
    };
    log('hook arena species');
  }

  function patchScene(s) {
    if (done.scene) return;
    done.scene = true;
    var f = s.getWaveMoneyAmount;
    if (typeof f === 'function') {
      s.getWaveMoneyAmount = function () {
        var r = f.apply(this, arguments);
        return has(3) ? Math.max(1, Math.floor(r * 0.85)) : r;
      };
      log('hook money');
    }
    var g = s.getEncounterBossSegments;
    if (typeof g === 'function') {
      s.getEncounterBossSegments = function (wave) {
        var r = g.apply(this, arguments);
        if (has(10) && wave >= 20 && wave % 5 === 0 && wave % 10 !== 0 && r === 0) r = 2;
        if (has(9) && r > 0) r += 1;
        return r;
      };
      log('hook boss segments');
    }
    // ---- A6 补一层：奖励和商店都拦——入库那一刻作废 ----
    var am = s.addModifier;
    if (typeof am === 'function' && !s.__prsMapBan) {
      s.__prsMapBan = true;
      s.addModifier = function (mod) {
        try {
          if (has(6)) {
            var nm = mod && mod.type && mod.type.name ? String(mod.type.name) : '';
            var grp = mod && mod.type && mod.type.group ? String(mod.type.group) : '';
            if (nm.indexOf('地图') === 0 || grp === 'map') {
              log('map banned at addModifier');
              return Promise.resolve(false);
            }
          }
        } catch (e) {}
        return am.apply(this, arguments);
      };
      log('hook addModifier (地图作废)');
    }
    var pm = s.phaseManager;
    if (pm && !pm.__prsPhase) {
      pm.__prsPhase = true;
      var start = pm.startCurrentPhase;
      pm.startCurrentPhase = function () {
        var ph = this.currentPhase;
        if (ph) beginPhase(ph);
        try { return start.apply(this, arguments); }
        finally { if (ph) endPhase(ph); }
      };
      log('hook phases');
    }
  }

  function beginPhase(ph) {
    curPhase = ph.phaseName || '';
    if (curPhase === 'PartyHealPhase') flags.healPhase = true;
    if (curPhase === 'FaintPhase') flags.faintPhase = true;
    if (curPhase === 'ExpPhase' && has(8) && typeof ph.expValue === 'number') ph.expValue = Math.floor(ph.expValue * 0.8);
    if (curPhase === 'SelectModifierPhase') patchModifierPhase(ph);
  }
  function endPhase(ph) {
    if (curPhase === 'PartyHealPhase') flags.healPhase = false;
    if (curPhase === 'FaintPhase') flags.faintPhase = false;
    curPhase = '';
  }

  // ---- A6 摘掉地图道具 ----
  function patchModifierPhase(ph) {
    var proto = Object.getPrototypeOf(ph);
    if (!proto || proto.__prsMod) return;
    proto.__prsMod = true;
    var orig = proto.getModifierTypeOptions;
    if (typeof orig !== 'function') { log('no getModifierTypeOptions'); return; }
    proto.getModifierTypeOptions = function () {
      var opts = orig.apply(this, arguments);
      try {
        if (has(6) && Array.isArray(opts)) {
          var kept = opts.filter(function (o) {
            var nm = o && o.type && o.type.name ? String(o.type.name) : '';
            return nm.indexOf('地图') !== 0;
          });
          if (kept.length && kept.length !== opts.length) { log('map item removed ' + opts.length + ' -> ' + kept.length); return kept; }
        }
      } catch (e) {}
      return opts;
    };
    log('hook modifier options');
  }

  // ---- 选择界面 ----
  var panel = null, label = null, labelScene = null, onStarterNow = false, starterShown = false, starterHandler = null;
  // 左上角那一行，跟「城镇 -1」同一层：ena 的是游戏自己的 emerald 像素字体
  // ---- 悬停提示：把当前生效的进阶列出来 ----
  var tipLayer = null, tipBox = null, tipText = null;
  function showTip(s) {
    try {
      var lines = [];
      for (var n = 1; n <= lv(); n++) lines.push("A" + n + " " + RULES[n - 1][1]);
      var text = lines.length ? lines.join(String.fromCharCode(10)) : "未开启进阶";
      var rows = Math.max(1, lines.length);
      var w = 78, h = 10 + rows * 11;
      if (!tipLayer) {
        var src = findWindow(s);
        var key = src ? src.texture.key : "window_1";
        tipLayer = s.add.container(0, 0).setScale(6).setDepth(1e6 - 1).setName("prs-asc-tip");
        tipBox = s.add.nineslice(2, 17, key, src && src.frame ? src.frame.name : void 0, w, h, 8, 8, 8, 8).setOrigin(0);
        tipText = s.add.text(7, 21, "", {
          fontFamily: "emerald", fontSize: 42, color: "#f8f8f8", lineSpacing: 8,
          wordWrap: { width: (w - 12) * 6 }
        }).setScale(1 / 6).setShadow(3, 4, "#0b0910", 0, false, true);
        tipLayer.add(tipBox);
        tipLayer.add(tipText);
      }
      try { tipBox.setSize(w, h); } catch (e) {}
      tipText.setText(text);
      tipLayer.setVisible(true);
    } catch (e) { log("tip error " + (e && e.message)); }
  }
  function hideTip() { try { if (tipLayer) tipLayer.setVisible(false); } catch (e) {} }

  function ensureLabel(s) {
    if (!window.Phaser || !s || !s.add || !s.children) return;
    if (label && labelScene === s && label.scene === s && label.active) { refreshLabel(); return; }
    try { if (label && label.scene) label.destroy(); } catch (e) {}
    try {
      labelScene = s;
      var layer = s.add.container(0, 0).setScale(6).setDepth(1e6 - 2).setName("prs-asc-label");
      var t = new Phaser.GameObjects.Text(s, 0, 0, "进阶 -" + lv(), { fontFamily: "emerald", fontSize: 72, color: "#f8f8f8", padding: { bottom: 6 } });
      t.setScale(1 / 6).setShadow(3, 4, "#0b0910", 0, false, true);
      t.setPosition(2, 1);
      try {
        t.setInteractive({ useHandCursor: true });
        t.on("pointerover", function () { showTip(s); });
        t.on("pointerout", function () { hideTip(); });
      } catch (e) { log("hover bind failed " + (e && e.message)); }
      layer.add(t);
      label = t;
      log("label drawn");
    } catch (e) { log("label error " + (e && e.message)); }
    refreshLabel();
  }
  function refreshLabel() {
    try {
      if (!label) return;
      label.setText("进阶 -" + lv());
      var inBattle = !!(labelScene && labelScene.currentBattle && labelScene.currentBattle.waveIndex);
      label.setVisible(lv() > 0 && inBattle && !onStarterNow);
      if (!label.visible) hideTip();
    } catch (e) {}
  }
  // 新游戏时自动弹出一次选择（选完就记住，不再打扰）
  // ---- 附加说明框 ----
  // 关键：游戏世界是 320x180，画布整体缩放 6 倍显示（1920x1080）。
  // 所以这里全部用世界坐标，并放进一个 scale(6) 的容器里，九宫格的 8 像素切边才会变成 48 像素的粗边框。
  var descLayer = null, descBox = null, descText = null;
  function findWindow(s) {
    var hit = null;
    function consider(o) {
      if (!hit && o && o.type === "NineSlice" && o.texture && /^window_/.test(o.texture.key) && o.leftWidth > 0) hit = o;
    }
    function walk(list, depth) {
      if (!list || depth > 6) return;
      for (var i = 0; i < list.length && !hit; i++) {
        var o = list[i];
        if (!o) continue;
        consider(o);
        if (o.list) walk(o.list, depth + 1);
      }
    }
    try { walk(s.children.list, 0); } catch (e) {}
    if (!hit) {
      try {
        var hs = (s.ui && s.ui.handlers) || [];
        for (var i = 0; i < hs.length && !hit; i++) {
          var c = hs[i] && hs[i].container;
          if (!c) continue;
          consider(c);
          if (c.list) walk(c.list, 1);
        }
      } catch (e) {}
    }
    return hit;
  }
  function showDesc(s, text) {
    try {
      if (!descLayer) {
        var src = findWindow(s);
        var key = src ? src.texture.key : "window_1";
        var bx = 5, by = 126, bw = 208, bh = 46;
        descLayer = s.add.container(0, 0).setScale(6).setDepth(1e6 - 2).setName("prs-asc-desc");
        descBox = s.add.nineslice(bx, by, key, src && src.frame ? src.frame.name : void 0, bw, bh, 8, 8, 8, 8).setOrigin(0);
        descText = s.add.text(bx + 10, by + 7, "", {
          fontFamily: "emerald", fontSize: 60, color: "#f8f8f8",
          wordWrap: { width: (bw - 20) * 6 }
        }).setScale(1 / 6).setLineSpacing(10).setShadow(3, 4, "#0b0910", 0, false, true);
        descLayer.add(descBox);
        descLayer.add(descText);
        log("desc box: world=" + bw + "x" + bh + " key=" + key + " fromWindow=" + !!src);
      }
      descText.setText(text || "");
    } catch (e) { log("desc error " + (e && e.message)); }
  }
  function hideDesc() {
    try { if (descLayer) { descLayer.destroy(); descLayer = null; descBox = null; descText = null; } } catch (e) {}
  }

  // ---- 存档界面：每个存档各自的进阶数 ----
  // 一局的进阶跟这局的种子绑，存在本机（不动游戏存档）
  var slotHandler = null;
  function runLevels() {
    try { return JSON.parse(localStorage.getItem("prs-asc-runs-v1") || "{}"); } catch (e) { return {}; }
  }
  function recordRunLevel(s) {
    try {
      var b = s.currentBattle;
      if (!b || !(b.waveIndex > 0) || s.seed == null) return;
      var k = String(s.seed), m = runLevels();
      if (m[k] !== lv()) { m[k] = lv(); localStorage.setItem("prs-asc-runs-v1", JSON.stringify(m)); }
    } catch (e) {}
  }
  function seedOfSlot(slot) {
    try { if (slot && slot.saveData && slot.saveData.seed != null) return String(slot.saveData.seed); } catch (e) {}
    try {
      var id = slot && slot.slotId;
      if (id != null) {
        var raw = localStorage.getItem("sessionData" + (id + 1) + "_Guest");
        if (raw) { var o = JSON.parse(raw); if (o && o.seed != null) return String(o.seed); }
      }
    } catch (e) {}
    return null;
  }
  function tickSaveScreen(s) {
    try {
      var h = null;
      try { h = (s.ui && s.ui.getHandler) ? s.ui.getHandler() : null; } catch (e) {}
      if (!h || !Array.isArray(h.sessionSlots)) { slotHandler = null; return; }
      var m = runLevels();
      h.sessionSlots.forEach(function (slot) {
        if (!slot || typeof slot.add !== "function") return;
        var t = slot.getData ? slot.getData("prsAsc") : null;
        if (!t) {
          t = s.add.text(288, 5, "", { fontFamily: "emerald", fontSize: 84, color: "#f5c84c", padding: { bottom: 6 } })
            .setOrigin(1, 0).setScale(1 / 6).setShadow(3, 4, "#0b0910", 0, false, true);
          slot.add(t);
          try { slot.setData("prsAsc", t); } catch (e) {}
        }
        var seed = seedOfSlot(slot);
        var lvlv = (seed != null && m[seed] != null) ? m[seed] : null;
        if (lvlv == null) { t.setVisible(false); }
        else { t.setText("进阶 " + lvlv).setVisible(true); }
      });
      if (slotHandler !== h) { slotHandler = h; log("save screen labels active"); }
    } catch (e) { log("slot label error " + (e && e.message)); }
  }

  function setLevel(n) {
    cfg.level = Math.max(0, Math.min(10, Number(n) || 0));
    saveCfg(); refreshLabel(); applyToStarterScreen();
  }

  // 用游戏自己的列表菜单（mode 15）当选择器：框、字、光标、键位都是原生的，
  // 它自己会接管输入，不会漏到下面的界面去。光标停在哪条，下面的说明框就显示哪条的效果。
  function openNativePicker(h) {
    try {
      var ui = h.getUi ? h.getUi() : null;
      if (!ui || typeof ui.setModeWithoutClear !== "function") return false;
      var sc = window.PRS_SCENE;
      var NL = String.fromCharCode(10);
      var opts = [];
      opts.push({
        label: "关闭（进阶 0）",
        onHover: function () { showDesc(sc, "不开启任何进阶。" + NL + "除本 mod 提供的界面外，与未安装时完全一致。"); },
        handler: function () { hideDesc(); setLevel(0); ui.setMode(10); return true; }
      });
      for (var n = 1; n <= 10; n++) {
        (function (n) {
          opts.push({
            label: n + "  " + RULES[n - 1][1],
            onHover: function () { showDesc(sc, "A" + n + " " + RULES[n - 1][1] + NL + RULES[n - 1][2]); },
            handler: function () { hideDesc(); setLevel(n); ui.setMode(10); return true; }
          });
        })(n);
      }
      ui.setModeWithoutClear(15, { options: opts, maxOptions: 6 });
      log("native picker opened");
      return true;
    } catch (e) { log("native picker failed: " + (e && e.message)); return false; }
  }

  // 改了等级就立刻作用到选人界面：上限、图标、点数显示
  function applyToStarterScreen() {
    try {
      var s = window.PRS_SCENE;
      if (!s || !s.ui || !s.ui.getHandler) return;
      var h = s.ui.getHandler();
      if (!h || !Array.isArray(h.partyStarterIds)) return;
      if (lv() >= 5 && typeof h.popPartyStarter === "function") {
        var guard = 0;
        while (h.partyStarterIds.length > 5 && guard++ < 12) h.popPartyStarter(h.partyStarterIds.length - 1);
      }
      onStarterNow = true;
      if (Array.isArray(h.partyIcons)) {
        var max = lv() >= 5 ? 5 : 6;
        for (var i = 0; i < h.partyIcons.length; i++) { try { h.partyIcons[i].setVisible(i < max); } catch (e) {} }
      }
      if (typeof h.tryUpdateValue === "function") h.tryUpdateValue(0);
    } catch (e) { log("apply screen error " + (e && e.message)); }
  }

  // 每次启动游戏后，第一次进入选人界面弹一次；之后想改按 F8
  // 顺带按当前等级藏掉多余的初始图标（那几个 ? 是在界面创建时就画好的，只能在这里藏）
  function autoOpenOnNewGame(s) {
    var h = null;
    try { h = (s.ui && s.ui.getHandler) ? s.ui.getHandler() : null; } catch (e) {}
    var live = !!(h && Array.isArray(h.partyStarterIds));
    if (live) starterHandler = h;
    // 中途开了概要/图鉴/队伍这类浮层时，当前 handler 会换成别的，但选人那块面板还立着，
    // 所以以"面板是否可见"为准：只要它还在，就算还在这一次选人里，不复位、不再弹。
    var stillUp = false;
    try {
      stillUp = !!(starterHandler && starterHandler.starterSelectContainer && starterHandler.starterSelectContainer.visible);
    } catch (e) {}
    onStarterNow = live || stillUp;
    var max = lv() >= 5 ? 5 : 6;
    if (onStarterNow) {
      var hh = live ? h : starterHandler;
      try {
        if (hh && Array.isArray(hh.partyIcons)) {
          for (var i = 0; i < hh.partyIcons.length; i++) hh.partyIcons[i].setVisible(i < max);
        }
      } catch (e) {}
      if (!starterShown) { starterShown = true; if (!openNativePicker(hh)) openPanel("newgame"); }
    } else {
      starterShown = false;   // 真离开了（回标题 / 开打 / 强刷重载）：下一次进新游戏照弹
      hideDesc();
    }
  }
  function togglePanel(src) { if (panel) closePanel(); else openPanel(src); }
  function closePanel() { if (panel && panel.parentNode) panel.parentNode.removeChild(panel); panel = null; try { var sc = window.PRS_SCENE; if (sc && sc.input && sc.input.keyboard) sc.input.keyboard.enabled = true; } catch (e) {} }
  function openPanel(src) {
    closePanel();
    var mask = document.createElement('div');
    mask.style.cssText = 'position:fixed;inset:0;z-index:2147483001;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;font-family:-apple-system,"Microsoft YaHei",sans-serif';
    var card = document.createElement('div');
    card.style.cssText = 'width:min(94vw,560px);max-height:88vh;overflow:auto;padding:16px 18px;border-radius:12px;background:#2b2633;color:#f1eef5;font-size:13.5px;line-height:1.55';
    var h = document.createElement('div');
    h.textContent = '进阶等级';
    h.style.cssText = 'font-size:18px;margin-bottom:2px';
    card.appendChild(h);
    var sub = document.createElement('div');
    sub.textContent = '累积生效：选 N 级 = 第 1 到第 N 条全部打开。改了立刻生效。';
    sub.style.cssText = 'color:#b3abc0;font-size:12px;margin-bottom:10px';
    card.appendChild(sub);
    var row = document.createElement('div');
    row.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px';
    var setLv = function (n) {
      cfg.level = n; saveCfg(); refreshLabel(); applyToStarterScreen();
      Array.prototype.forEach.call(row.children, function (b, i) {
        b.style.background = i === n ? '#6d5bd0' : '#1f1b26';
        b.style.color = i === n ? '#fff' : '#c9c2d6';
      });
    };
    for (var n = 0; n <= 10; n++) {
      (function (n) {
        var b = document.createElement('button');
        b.textContent = n === 0 ? '关闭' : String(n);
        b.style.cssText = 'width:44px;height:34px;border:0;border-radius:7px;cursor:pointer;font-size:14px';
        b.addEventListener('click', function () { setLv(n); });
        row.appendChild(b);
      })(n);
    }
    card.appendChild(row);
    var list = document.createElement('div');
    RULES.forEach(function (r) {
      var d = document.createElement('div');
      d.style.cssText = 'display:flex;gap:8px;padding:5px 0;border-top:1px solid #3a3446';
      var id = document.createElement('b');
      id.textContent = 'A' + r[0];
      id.style.cssText = 'color:#f5c84c;min-width:26px';
      var tx = document.createElement('div');
      tx.textContent = r[1] + '：' + r[2];
      d.appendChild(id); d.appendChild(tx);
      list.appendChild(d);
    });
    card.appendChild(list);
    var foot = document.createElement('div');
    foot.style.cssText = 'display:flex;justify-content:flex-end;margin-top:12px';
    var ok = document.createElement('button');
    ok.textContent = '回到游戏';
    ok.style.cssText = 'padding:7px 14px;border:0;border-radius:7px;background:#6d5bd0;color:#fff;cursor:pointer';
    ok.addEventListener('click', closePanel);
    foot.appendChild(ok);
    card.appendChild(foot);
    mask.appendChild(card);
    mask.addEventListener('click', function (e) { if (e.target === mask) closePanel(); });
    document.body.appendChild(mask);
    panel = mask;
    try { var sc0 = window.PRS_SCENE; if (sc0 && sc0.input && sc0.input.keyboard) sc0.input.keyboard.enabled = false; } catch (e) {}
    setLv(lv());
    log('panel opened (' + (src || '?') + '), level ' + lv());
  }

  window.addEventListener('keydown', function (e) {
    if (!e.isTrusted) return;
    if (e.key === 'F8') { e.preventDefault(); e.stopImmediatePropagation(); togglePanel('key'); }
  }, true);

  setInterval(function () {
    try {
      var s = window.PRS_SCENE;
      if (!s || !s.phaseManager) return;
      autoOpenOnNewGame(s);
      recordRunLevel(s);
      tickSaveScreen(s);
      ensureLabel(s);
      patchScene(s);
      patchArena(s);
      patchGameMode(s);
      if (!done.pokemon) {
        var party = null;
        try { party = s.getPlayerParty(); } catch (e) {}
        var any = (party && party[0]) || (s.currentBattle && s.currentBattle.enemyParty && s.currentBattle.enemyParty[0]);
        if (any) { patchPokemon(any); done.pokemon = true; }
      }
    } catch (e) { log('tick error ' + (e && e.message)); }
  }, 500);

  window.PRS_ASC = { version: '0.1', level: lv, setLevel: function (n) { cfg.level = n; saveCfg(); refreshLabel(); }, open: openPanel };
  log('loaded v0.1, level ' + lv());
})();
