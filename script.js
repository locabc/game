    // generate_levels_full.js
    // Full generator per user's spec:
    // - Levels from L36_2 .. L50_3 (45 screens total starting at 36_2)
    // - 20 special screens (5 rock, 8 gold, 7 mole) spaced >= 5 screens apart
    // - Normal screens otherwise
    // - Goals: Normal 5500-7500, Gold 6500-8000, Mole 6000-7500, Rock 4000-4500
    // - Goal increases smoothly across levels (global progression, then clamped to category range)
    // - Entities per level: minEntities = 20, maxEntities = 25 (keeps >=20 as requested)
    // - Place entities with placeEntity() + checkCollision (minDist ~35) to avoid overlap
    // - When adding adjustment entities to reach goal, always call placeEntity (so no collision)
    // - Output to levels.js in the compact line-per-entity format you requested

    const fs = require("fs");

    // ==== CONFIG ====
    const START_LV = 13;
    const END_LV = 30;
    const SUB_COUNT = 3; // _1.._3 per chapter
    const START_SUB = 1; // start from 36_2
    const TOTAL_SCREENS = ((END_LV - START_LV + 1) * SUB_COUNT) - (START_SUB - 1); // 45

    const X_MIN = 20, X_MAX = 300;
    const Y_MIN = 75, Y_MAX = 215;

    // keep at least 17 entities when trimming as requested
    const MIN_ENTITIES = 15;
    const MAX_ENTITIES = 20;

    // collision distance (pixels)
    const MIN_DIST = 35;

    // Bonus table (used to compute goal)
    const BONUS = {
      MiniGold: 50,
      NormalGold: 100,
      NormalGoldPlus: 250,
      BigGold: 500,
      MiniRock: 11,
      NormalRock: 20,
      BigRock: 100,
      Diamond: 600,
      Skull: 20,
      Bone: 7,
      Mole: 2,
      MoleWithDiamond: 602,
      TNT: 2,
      QuestionBag: 0
    };

    // helper
    const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    const randDir = () => (Math.random() > 0.5 ? "Left" : "Right");

    // ==== collision & placement ====
    function checkCollision(newEntity, entities, minDist = MIN_DIST) {
      for (const e of entities) {
        const dx = newEntity.pos.x - e.pos.x;
        const dy = newEntity.pos.y - e.pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDist) return true; // overlap
      }
      return false;
    }

    function placeEntity(type, entities, attemptsLimit = 1000) {
      // returns an entity object with pos and optional dir, guaranteed (best-effort) not overlapping existing ones
      let tries = 0;
      while (tries < attemptsLimit) {
        const candidate = {
          type,
          pos: { x: rand(X_MIN, X_MAX), y: rand(Y_MIN, Y_MAX) }
        };
        if (type === "Mole" || type === "MoleWithDiamond") candidate.dir = randDir();
        if (!checkCollision(candidate, entities)) return candidate;
        tries++;
      }
      // fallback: log warning and return a candidate (may overlap) to avoid crashing
      console.warn(`⚠️ placeEntity: couldn't place ${type} after ${attemptsLimit} tries — returning fallback (may overlap).`);
      const fallback = { type, pos: { x: rand(X_MIN, X_MAX), y: rand(Y_MIN, Y_MAX) } };
      if (type === "Mole" || type === "MoleWithDiamond") fallback.dir = randDir();
      return fallback;
    }

    // ==== helper to distribute special screens spaced >=5 apart ====
    // ==== helper để phân bố màn đặc biệt (không yêu cầu khoảng cách >=5) ====
    function distributeSpecialLevels(totalScreens, specials) {
      // specials: mảng các chuỗi (e.g. ["rock","rock",...,"gold",...])
      // trả về slots[0..totalScreens-1] với giá trị 'normal' hoặc một trong specials
      const slots = Array(totalScreens).fill("normal");

      // Xáo trộn các chỉ số từ 0 đến totalScreens-1
      const indices = Array.from({ length: totalScreens }, (_, i) => i);
      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }

      // Chọn 18 vị trí đầu tiên để đặt specials
      const shuffledSpecials = specials.slice().sort(() => Math.random() - 0.5);
      for (let i = 0; i < Math.min(shuffledSpecials.length, totalScreens); i++) {
        slots[indices[i]] = shuffledSpecials[i];
      }

      return slots;
    }

    // ==== goal progression function ====
    function calcGlobalGoal(levelIndex, base = 5500, totalScreens = TOTAL_SCREENS) {
      // levelIndex: 0..TOTAL_SCREENS-1
      // produce a smooth increasing baseline across the whole sequence, with small randomness
      const maxExtra = 2500; // extra room up to about 8000
      const t = levelIndex / Math.max(1, totalScreens - 1); // 0..1
      let baseline = Math.round(base + t * maxExtra);
      // small variance so not strictly linear
      baseline += rand(-200, 200);
      return Math.max(base, baseline);
    }

    // ==== generator that builds entity lists to meet a goal target (greedy) ====
    function generateEntitiesByGoal(goalTarget, pool, existingEntities = []) {
      // pool: array of types to choose from (e.g. ["MiniGold","NormalGold","Diamond","TNT"])
      // existingEntities: current placed entities (for collision checks)
      const entities = existingEntities.slice();
      let accumulated = entities.reduce((s, e) => s + (BONUS[e.type] || 0), 0);

      // keep adding until reach target or reach MAX_ENTITIES
      const smallAllowance = 200; // allow slight overshoot
      const triesLimit = 8000; // to avoid infinite loop
      let tries = 0;

      // Prefer higher-value items occasionally but keep variety
      while ((accumulated < goalTarget) && (entities.length < MAX_ENTITIES) && tries < triesLimit) {
        // get candidate types that won't over-overshoot too much
        const candidates = pool.filter(t => {
          const val = BONUS[t] || 0;
          return accumulated + val <= goalTarget + smallAllowance;
        });

        let pick;
        if (candidates.length === 0) {
          // no candidate fits, allow adding a high-value item (to approach the target)
          // pick biggest in pool if it helps
          const sortedByVal = pool.slice().sort((a, b) => (BONUS[b] || 0) - (BONUS[a] || 0));
          pick = sortedByVal[0];
        } else {
          // random pick among candidates but bias toward medium/high values
          // construct weighted array: higher bonus -> more weight
          const weighted = [];
          for (const c of candidates) {
            const w = Math.max(1, Math.floor((BONUS[c] || 0) / 50));
            for (let k = 0; k < w; k++) weighted.push(c);
          }
          pick = weighted[rand(0, weighted.length - 1)];
        }

        const ent = placeEntity(pick, entities);
        entities.push(ent);
        accumulated += BONUS[pick] || 0;
        tries++;
      }

      // If still below target and we didn't reach MAX_ENTITIES, add big items forcibly
      const bigChoices = pool.filter(t => (BONUS[t] || 0) >= 250);
      let safety = 0;
      while ((accumulated < goalTarget) && (entities.length < MAX_ENTITIES) && safety < 50) {
        const pick = bigChoices.length ? bigChoices[rand(0, bigChoices.length - 1)] : pool[rand(0, pool.length - 1)];
        const ent = placeEntity(pick, entities);
        entities.push(ent);
        accumulated += BONUS[pick] || 0;
        safety++;
      }

      return { entities, accumulated };
    }

    // ==== trimming function when goal > maxGoal ====
    // ==== Hàm cắt giảm/điều chỉnh để đảm bảo mục tiêu trong khoảng minGoal và maxGoal ====
    function trimEntitiesToGoalRange(entities, minGoal, maxGoal) {
      let acc = entities.reduce((s, e) => s + (BONUS[e.type] || 0), 0);
      if (acc >= minGoal && acc <= maxGoal) return { entities, acc };

      // Bước 1: Cắt giảm nếu vượt quá maxGoal
      if (acc > maxGoal) {
        // Sắp xếp theo giá trị giảm dần để xóa thực thể giá trị cao trước
        const order = entities
          .map((e, i) => ({ i, val: BONUS[e.type] || 0, type: e.type }))
          .sort((a, b) => b.val - a.val); // Cao đến thấp

        for (const o of order) {
          if (entities.length <= MIN_ENTITIES) break;
          if (acc <= maxGoal) break;
          const idx = entities.findIndex(it => it === entities[o.i]);
          if (idx >= 0) {
            const removed = entities.splice(idx, 1)[0];
            acc -= BONUS[removed.type] || 0;
          }
        }
      }

      // Bước 2: Tăng lên nếu thấp hơn minGoal
      if (acc < minGoal && entities.length < MAX_ENTITIES) {
        // Danh sách thực thể khả dụng phụ thuộc vào loại màn
        const pool = entities.length > 0 ? Object.keys(BONUS).filter(t => BONUS[t] > 0) : ["NormalGold"];
        let safety = 0;
        while (acc < minGoal && entities.length < MAX_ENTITIES && safety < 50) {
          // Ưu tiên thực thể giá trị trung bình để tránh vượt quá xa
          const candidates = pool.filter(t => BONUS[t] <= minGoal - acc + 200);
          const pick = candidates.length > 0 ? candidates[rand(0, candidates.length - 1)] : pool[rand(0, pool.length - 1)];
          const ent = placeEntity(pick, entities);
          entities.push(ent);
          acc += BONUS[pick] || 0;
          safety++;
        }
      }

      // Bước 3: Cắt giảm lại nếu vượt quá maxGoal
      if (acc > maxGoal) {
        const order = entities
          .map((e, i) => ({ i, val: BONUS[e.type] || 0 }))
          .sort((a, b) => a.val - b.val); // Thấp đến cao
        for (const o of order) {
          if (entities.length <= MIN_ENTITIES) break;
          if (acc <= maxGoal) break;
          const idx = entities.findIndex(it => it === entities[o.i]);
          if (idx >= 0) {
            const removed = entities.splice(idx, 1)[0];
            acc -= BONUS[removed.type] || 0;
          }
        }
      }

      return { entities, acc };
    }

    // ==== Hàm tạo một màn ====
    function generateLevel(levelName, category, globalGoalBaseline, levelIndex) {
      // category: "normal" | "gold" | "rock" | "mole"
      // globalGoalBaseline: mục tiêu cơ bản từ calcGlobalGoal
      const ranges = {
        normal: { min: 2000, max: 3500 },
        gold: { min: 2500, max: 4000 },
        mole: { min: 3500, max: 5000 },
        rock: { min: 1500, max: 2500 }
      };

      const catRange = ranges[category] || ranges.normal;
      const target = Math.max(catRange.min, Math.min(catRange.max, globalGoalBaseline));

      let pool, entities = [], acc = 0;

      if (category === "rock") {
        pool = ["MiniRock", "NormalRock", "BigRock", "Skull", "Bone"];
        const count = rand(MIN_ENTITIES, MAX_ENTITIES);
        for (let i = 0; i < count; i++) {
          const t = pool[rand(0, pool.length - 1)];
          const e = placeEntity(t, entities);
          entities.push(e);
          acc += BONUS[t] || 0;
        }
        // Điều chỉnh để đạt mục tiêu
        while (acc < target && entities.length < MAX_ENTITIES) {
          const t = ["BigGold", "NormalGold", "MiniGold"][rand(0, 2)]; // Ưu tiên giá trị cao hơn
          const e = placeEntity(t, entities);
          entities.push(e);
          acc += BONUS[t] || 0;
        }
      } else if (category === "mole") {
        pool = ["Mole", "MoleWithDiamond", "TNT"];
        const count = rand(MIN_ENTITIES, MAX_ENTITIES);
        let tntCount = 0;
        for (let i = 0; i < count; i++) {
          let t = pool[rand(0, pool.length - 1)];
          if (t === "TNT" && tntCount >= 5) {
            t = rand(0, 1) ? "Mole" : "MoleWithDiamond";
          } else if (t === "TNT") {
            tntCount++;
          }
          const e = placeEntity(t, entities);
          entities.push(e);
          acc += BONUS[t] || 0;
        }
        // Điều chỉnh để đạt mục tiêu
        while (acc < target && entities.length < MAX_ENTITIES) {
          const t = "MoleWithDiamond"; // Giá trị cao để đạt mục tiêu
          const e = placeEntity(t, entities);
          entities.push(e);
          acc += BONUS[t] || 0;
        }
      } else if (category === "gold") {
        pool = ["MiniGold", "NormalGold", "NormalGoldPlus", "BigGold", "Diamond", "TNT"];
        const result = generateEntitiesByGoal(target, pool, []);
        entities = result.entities;
        acc = result.accumulated;
        // Đảm bảo số lượng thực thể tối thiểu
        while (entities.length < MIN_ENTITIES) {
          const t = ["MiniGold", "NormalGold"][rand(0, 1)];
          entities.push(placeEntity(t, entities));
          acc += BONUS[t] || 0;
        }
      } else { // normal
        pool = [
          "MiniGold", "NormalGold", "NormalGoldPlus", "BigGold", "Diamond",
          "MiniRock", "NormalRock", "BigRock",
          "Skull", "Bone", "QuestionBag", "TNT"
        ];
        const count = rand(MIN_ENTITIES, MAX_ENTITIES);
        for (let i = 0; i < count; i++) {
          const t = pool[rand(0, pool.length - 1)];
          const e = placeEntity(t, entities);
          entities.push(e);
          acc += BONUS[t] || 0;
        }
        const goldChoices = ["MiniGold", "NormalGold", "NormalGoldPlus"];
        let safety = 0;
        while (acc < target && entities.length < MAX_ENTITIES && safety < 200) {
          const t = goldChoices[rand(0, goldChoices.length - 1)];
          const e = placeEntity(t, entities);
          entities.push(e);
          acc += BONUS[t] || 0;
          safety++;
        }
      }

      // Điều chỉnh cuối cùng để đảm bảo mục tiêu trong khoảng minGoal và maxGoal
      const res = trimEntitiesToGoalRange(entities, catRange.min, catRange.max);
      return { [levelName]: { type: "LevelE", goal: res.acc, entities: res.entities } };
    }
    // ==== output formatter (compact, 1 entity per line similar to user's example) ====
    function formatLevelOutput(levelsObject) {
      let out = "";
      for (const [name, lv] of Object.entries(levelsObject)) {
        out += `"${name}": {\n`;
        out += `    "type": "LevelE",\n`;
        if (lv.goal !== undefined) out += `    "goal": ${lv.goal},\n`;
        out += `    "entities": [\n`;
        lv.entities.forEach((e, i) => {
          let line = `        { "type": "${e.type}", "pos": { "x": ${e.pos.x}, "y": ${e.pos.y} }`;
          if (e.dir) line += `, "dir": "${e.dir}"`;
          line += " }";
          if (i < lv.entities.length - 1) line += ",";
          out += line + "\n";
        });
        out += `    ]\n`;
        out += `},\n`;
      }
      return out;
    }

    // ==== MAIN: build list of levels L36_2 .. L50_3 ====
    function main() {
      // build specials array: 5 rock, 8 gold, 7 mole
      const specials = [
        ...Array(5).fill("rock"),
        ...Array(6).fill("gold"),
        ...Array(7).fill("mole")
      ];

      const slots = distributeSpecialLevels(TOTAL_SCREENS, specials);
      // slots is size TOTAL_SCREENS, values 'normal' or 'rock'/'gold'/'mole'

      const result = {};
      let screenIdx = 0;

      for (let lv = START_LV; lv <= END_LV; lv++) {
        for (let sub = 1; sub <= SUB_COUNT; sub++) {
          if (lv === START_LV && sub < START_SUB) continue;
          if (screenIdx >= TOTAL_SCREENS) break;

          const name = `L${lv}_${sub}`;
          const slotType = slots[screenIdx] || "normal";

          // global baseline goal increasing across total screens
          const baseline = calcGlobalGoal(screenIdx, 5500, TOTAL_SCREENS);

          const lvlObj = generateLevel(name, slotType, baseline, screenIdx);
          Object.assign(result, lvlObj);
          // Trong main(), sau Object.assign(result, lvlObj);
    console.log(`Màn ${name} (${slotType}): goal = ${lvlObj[name].goal}`);
          screenIdx++;
        }
      }

      // write file
      const body = formatLevelOutput(result);
      fs.writeFileSync("levels.js", body, "utf8");
      console.log(`✅ Generated levels.js with ${Object.keys(result).length} levels`);
    }

    main();
