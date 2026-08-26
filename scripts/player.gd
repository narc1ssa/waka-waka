extends CharacterBody2D

signal stage_display_name_changed(display_name)
signal death_finished()

@export var base_speed := 140.0
@export var stages: Array[StageData] = []

# На какую стадию возвращается игрок после таблетки.
@export var pill_target_stage := 1

@onready var eat_area: Area2D = $EatArea

var visual: Node2D
var sprite: Sprite2D
var animated_sprite: AnimatedSprite2D

var current_speed_multiplier := 1.0
var current_stage_name := ""
var current_stage_data: StageData = null
var transition_tween: Tween

var last_horizontal_direction := "right"
var is_dead := false


func _ready() -> void:
	add_to_group("player")

	visual = get_node_or_null("Visual")
	sprite = get_node_or_null("Visual/Sprite2D")
	animated_sprite = get_node_or_null("Visual/AnimatedSprite2D")

	eat_area.area_entered.connect(_on_eat_area_area_entered)
	eat_area.body_entered.connect(_on_eat_area_body_entered)

	AgeManager.stage_changed.connect(_on_stage_changed)
	AgeManager.player_died_old_age.connect(_on_player_died)
	AgeManager.game_reset.connect(_on_game_reset)

	apply_stage(AgeManager.stage)


func _physics_process(delta: float) -> void:
	if is_dead:
		return

	var input_vector := Vector2.ZERO

	input_vector.x = Input.get_axis("ui_left", "ui_right")
	input_vector.y = Input.get_axis("ui_up", "ui_down")

	update_animation(input_vector)

	var final_speed := base_speed * current_speed_multiplier

	velocity = input_vector.normalized() * final_speed
	move_and_slide()


func _on_eat_area_area_entered(area: Area2D) -> void:
	if area.is_in_group("pill"):
		AgeManager.eat_rejuvenating_pill(pill_target_stage)
		AudioManager.play_eat_sfx()
		_consume_area(area)


func _on_eat_area_body_entered(body: Node2D) -> void:
	if body.is_in_group("enemy"):
		AgeManager.eat_enemy()
		AudioManager.play_eat_sfx()
		_consume_area(body)


func _consume_area(node: Node2D) -> void:
	if not is_instance_valid(node):
		return

	if node.has_method("eat"):
		node.eat()
	else:
		node.queue_free()


func _on_stage_changed(new_stage: int) -> void:
	apply_stage(new_stage)


func _on_player_died() -> void:
	is_dead = true

	set_physics_process(false)
	velocity = Vector2.ZERO

	if eat_area:
		eat_area.monitoring = false

	play_death_animation()


func _on_game_reset() -> void:
	is_dead = false

	set_physics_process(true)

	if eat_area:
		eat_area.monitoring = true

	apply_stage(AgeManager.stage)


func play_death_animation() -> void:
	if not animated_sprite or not animated_sprite.sprite_frames:
		death_finished.emit()
		return

	var death_anim := ""

	# Сначала ищем смерть для текущего возраста, например baby_death.
	if current_stage_data and current_stage_data.animation_prefix != "":
		var prefixed := current_stage_data.animation_prefix + "_death"

		if animated_sprite.sprite_frames.has_animation(prefixed):
			death_anim = prefixed

	# Если нет, берём общую анимацию смерти.
	if death_anim == "" and animated_sprite.sprite_frames.has_animation("death"):
		death_anim = "death"

	# Если анимации смерти вообще нет, просто сообщаем о конце.
	if death_anim == "":
		death_finished.emit()
		return

	if not animated_sprite.animation_finished.is_connected(_on_death_animation_finished):
		animated_sprite.animation_finished.connect(_on_death_animation_finished)

	animated_sprite.play(death_anim)


func _on_death_animation_finished() -> void:
	death_finished.emit()


func apply_stage(new_stage: int) -> void:
	var index := new_stage - 1

	if index < 0:
		return

	var target_modulate := Color.WHITE
	var target_scale := 1.0

	current_speed_multiplier = 1.0
	current_stage_name = "Стадия %d" % new_stage
	current_stage_data = null

	if index < stages.size() and stages[index] != null:
		var data: StageData = stages[index]

		current_stage_data = data

		if data.stage_name != "":
			current_stage_name = data.stage_name

		target_modulate = data.modulate
		target_scale = data.visual_scale
		current_speed_multiplier = data.speed_multiplier

		if sprite and data.texture:
			sprite.texture = data.texture

	else:
		var max_index := AgeManager.MAX_STAGE - 1

		if max_index < 1:
			max_index = 1

		var fallback_index := mini(index, max_index)
		var t := float(fallback_index) / float(max_index)

		target_modulate = Color.from_hsv(t, 0.65, 0.95)
		target_scale = 0.6 + (1.25 - 0.6) * t
		current_speed_multiplier = 1.35 + (0.6 - 1.35) * t

	if visual:
		if transition_tween:
			transition_tween.kill()

		transition_tween = create_tween()
		transition_tween.set_parallel(true)

		transition_tween.tween_property(
			visual,
			"modulate",
			target_modulate,
			0.2
		)

		transition_tween.tween_property(
			visual,
			"scale",
			Vector2.ONE * target_scale,
			0.2
		)

	stage_display_name_changed.emit(current_stage_name)

	update_animation(Vector2.ZERO)


func update_animation(input_vector: Vector2) -> void:
	if is_dead:
		return

	if not animated_sprite:
		return

	if not animated_sprite.sprite_frames:
		return

	if current_stage_data == null:
		return

	var state := "idle"
	if input_vector != Vector2.ZERO:
		state = "walk"

	var direction := get_direction_name(input_vector)

	if direction == "left" or direction == "right":
		last_horizontal_direction = direction

	var animation_name := find_best_animation(state, direction)

	if animation_name == "":
		animation_name = current_stage_data.animation_name

	if animation_name == "":
		animation_name = current_stage_data.animation_prefix

	if animation_name == "":
		return

	if not animated_sprite.sprite_frames.has_animation(animation_name):
		return

	if String(animated_sprite.animation) != animation_name:
		animated_sprite.play(animation_name)

	apply_flip(direction, animation_name)


func get_direction_name(input_vector: Vector2) -> String:
	if input_vector == Vector2.ZERO:
		return last_horizontal_direction

	if abs(input_vector.x) > abs(input_vector.y):
		if input_vector.x > 0.0:
			return "right"
		else:
			return "left"
	else:
		if input_vector.y > 0.0:
			return "down"
		else:
			return "up"


func find_best_animation(state: String, direction: String) -> String:
	if current_stage_data == null:
		return ""

	var prefix := current_stage_data.animation_prefix

	if prefix == "":
		return ""

	var candidates := []

	if state == "walk":
		candidates = [
			"%s_walk_%s" % [prefix, direction],
			"%s_walk" % prefix,
			"%s_run_%s" % [prefix, direction],
			"%s_run" % prefix,
			"%s_%s" % [prefix, direction],
			prefix
		]
	else:
		candidates = [
			"%s_idle_%s" % [prefix, direction],
			"%s_idle" % prefix,
			"%s_walk_%s" % [prefix, direction],
			"%s_walk" % prefix,
			prefix
		]

	for candidate in candidates:
		if animated_sprite.sprite_frames.has_animation(candidate):
			return candidate

	return ""


func apply_flip(direction: String, animation_name: String) -> void:
	if not animated_sprite:
		return

	if current_stage_data and not current_stage_data.use_horizontal_flip:
		return

	if animation_name.contains("_left") or animation_name.contains("_right"):
		animated_sprite.flip_h = false
		return

	if direction == "left":
		animated_sprite.flip_h = true
	elif direction == "right":
		animated_sprite.flip_h = false
	else:
		animated_sprite.flip_h = last_horizontal_direction == "left"
