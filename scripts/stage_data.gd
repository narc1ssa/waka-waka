class_name StageData
extends Resource

@export var stage_name := ""
@export var texture: Texture2D

# Старое поле, можно использовать как запасную анимацию.
@export var animation_name := ""

# Например: baby, child, adult, old.
# Если указать baby, скрипт будет искать:
# baby_idle, baby_walk_right, baby_walk_left и т.д.
@export var animation_prefix := ""

# Если true, то при движении влево анимация будет отражаться по горизонтали.
@export var use_horizontal_flip := true

@export var modulate := Color.WHITE

@export_range(0.1, 5.0, 0.05)
var visual_scale := 1.0

@export_range(0.1, 3.0, 0.05)
var speed_multiplier := 1.0
