#!/usr/bin/env python3
"""Parse Godot .tscn/.tres files, pull out SpriteFrames animations and copy the
referenced textures into promo/public/assets with ASCII-safe names."""
from __future__ import annotations
import json, re, shutil, sys, unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PROMO = ROOT / "promo"
OUT = PROMO / "public" / "assets"
MANIFEST = PROMO / "src" / "generated" / "animations.json"

EXT_RE = re.compile(r'\[ext_resource type="Texture2D" uid="[^"]*" path="res://([^"]+)" id="([^"]+)"\]')


def slug(text: str) -> str:
    text = unicodedata.normalize("NFKD", text)
    text = "".join(c for c in text if not unicodedata.combining(c))
    text = re.sub(r"[^A-Za-z0-9._-]+", "_", text).strip("_")
    return text


def parse_file(path: Path):
    src = path.read_text(encoding="utf-8")
    res = {m.group(2): m.group(1) for m in EXT_RE.finditer(src)}
    # Grab SpriteFrames sub-resources (tscn) or the resource itself (tres)
    chunks = []
    if "[sub_resource type=\"SpriteFrames\"" in src:
        chunks = re.findall(r'\[sub_resource type="SpriteFrames".*?(?=\n\[|\Z)', src, re.S)
    else:
        chunks = [src[src.index("animations = ["):]] if "animations = [" in src else []
    anims = {}
    for chunk in chunks:
        # split animations on top-level objects: {\n"frames": ...
        parts = re.findall(r'\{\s*"frames":\s*\[(.*?)\],\s*"loop".*?"name":\s*&"([^"]+)",\s*"speed":\s*([\d.]+)', chunk, re.S)
        for body, name, speed in parts:
            frames = re.findall(r'"texture":\s*ExtResource\("([^"]+)"\)', body)
            if not frames:
                continue
            anims[name] = {"speed": float(speed), "frames": [res.get(f) for f in frames]}
    return res, anims



def extract_game_rules() -> dict:
    """Pull the promo's spoken facts straight out of the game's source of truth."""
    stages = []
    for stage_file in sorted((ROOT / "data" / "stages").glob("stage_*.tres")):
        text = stage_file.read_text(encoding="utf-8")
        name = re.search(r'stage_name = "([^"]*)"', text)
        speed = re.search(r'speed_multiplier = ([\d.]+)', text)
        prefix = re.search(r'animation_prefix = "([^"]*)"', text)
        stages.append({
            "name": name.group(1) if name else "",
            "speed": float(speed.group(1)) if speed else 1.0,
            "animation": prefix.group(1) if prefix else "",
        })

    age = (ROOT / "scripts" / "age_manager.gd").read_text(encoding="utf-8")

    def const(name: str, default: int) -> int:
        m = re.search(rf"const {name} := (\d+)", age)
        return int(m.group(1)) if m else default

    project = (ROOT / "project.godot").read_text(encoding="utf-8")
    title = re.search(r'config/name="([^"]+)"', project)
    return {
        "title": title.group(1) if title else "Waka",
        "stages": stages,
        "killsPerStage": const("KILLS_PER_STAGE", 10),
        "maxStage": const("MAX_STAGE", 5),
        "oldAgeSeconds": const("OLD_AGE_TIME", 60),
        "winTotal": const("WIN_TOTAL", 300),
        "rareCats": 7,
    }


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    copied: dict[str, str] = {}
    all_anims: dict[str, dict] = {}

    sources = [ROOT / "scenes" / "player.tscn",
               ROOT / "assets" / "enemies" / "new_sprite_frames.tres",
               ROOT / "assets" / "enemies" / "rare_enemies.tres"]
    for src_file in sources:
        if not src_file.exists():
            print("skip (missing):", src_file)
            continue
        _, anims = parse_file(src_file)
        all_anims.update(anims)
        print(f"{src_file.name}: {len(anims)} animations")

    # every texture used in any animation
    for name, data in all_anims.items():
        out_frames = []
        for rel in data["frames"]:
            if rel is None:
                continue
            src = ROOT / rel
            if not src.exists():
                print("  MISSING", rel)
                continue
            dst_name = f"{slug(src.parent.name)}__{slug(src.name)}"
            dst = OUT / dst_name
            if not dst.exists():
                shutil.copy2(src, dst)
            copied[str(src.relative_to(ROOT))] = f"assets/{dst_name}"
            out_frames.append(f"assets/{dst_name}")
        data["frames"] = out_frames

    # plain images referenced directly by the promo
    extra = [
        "assets/map/map.png",
        "assets/map/Max_a_убери_кнопки_и_надпи.png",
        "assets/map/gameover_background.png",
        "assets/UI/EU/menu_background.png",
        "assets/UI/Max_a_на_первом_фото_сдела (1).png",
        "assets/UI/Max_a_перемести_череп_и_от.png",
        "assets/UI/EU/AllCatsCollected.png",
        "assets/UI/EU/Cats_collected_0_7.png",
        "assets/UI/EU/Cats_collected_1_7.png",
        "assets/UI/EU/Cats_collected_2_7.png",
        "assets/UI/EU/Cats_collected_3_7.png",
        "assets/UI/EU/Cats_collected_4_7.png",
        "assets/UI/EU/Cats_collected_5_7.png",
        "assets/UI/EU/Cats_collected_6_7.png",
        "assets/UI/EU/btn_play.png",
        "assets/UI/EU/gameover_title.png",
        "assets/pill/Max_a_создай_спрайт_домика.png",
        "assets/pill/Max_a_помести_в_домик_посе.png",
        "assets/rare_enemies/01_.png",
        "assets/rare_enemies/02_.png",
        "assets/rare_enemies/03_.png",
        "assets/rare_enemies/04_.png",
        "assets/rare_enemies/05_.png",
        "assets/rare_enemies/06_.png",
        "assets/rare_enemies/07_.png",
        "assets/rare_enemies/01_found.png",
        "assets/rare_enemies/02_found.png",
        "assets/rare_enemies/03_found.png",
        "assets/rare_enemies/04_found.png",
        "assets/rare_enemies/05_found.png",
        "assets/rare_enemies/06_found.png",
        "assets/rare_enemies/07_found.png",
    ]
    for rel in extra:
        src = ROOT / rel
        if not src.exists():
            print("  MISSING extra:", rel)
            continue
        dst_name = f"{slug(src.parent.name)}__{slug(src.name)}"
        dst = OUT / dst_name
        if not dst.exists():
            shutil.copy2(src, dst)
        copied[rel] = f"assets/{dst_name}"

    audio = ["music_level.mp3", "music_menu.mp3", "horror.mp3", "win.mp3", "chime.wav", "sound_eat.mp3"]
    for name in audio:
        src = ROOT / "music" / name
        dst = OUT / name
        if src.exists() and not dst.exists():
            shutil.copy2(src, dst)
        copied[f"music/{name}"] = f"assets/{name}"

    rules = extract_game_rules()
    (PROMO / "src" / "generated" / "game.json").write_text(
        json.dumps(rules, ensure_ascii=False, indent=2), encoding="utf-8")
    print("game rules:", json.dumps(rules, ensure_ascii=False))

    MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST.write_text(json.dumps({"animations": all_anims, "files": copied}, ensure_ascii=False, indent=2), encoding="utf-8")
    print("\nmanifest:", MANIFEST.relative_to(ROOT))
    print("animations:", ", ".join(sorted(all_anims)))
    total = sum(p.stat().st_size for p in OUT.iterdir())
    print(f"copied {len(list(OUT.iterdir()))} files, {total/1e6:.1f} MB")


if __name__ == "__main__":
    main()
