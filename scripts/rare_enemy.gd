extends CharacterBody2D

signal rare_eaten(value: int)

@export var animation_name := ""
@export var move_speed := 80.0
@export var min_direction_time := 0.8
@export var max_direction_time := 2.5

@export var reward := 5

var animated_sprite: AnimatedSprite2D
var direction := Vector2.RIGHT
var direction_timer := 0.0


func _ready() -> void:
	add_to_group("enemy")
	add_to_group("rare_enemy")

	animated_sprite = get_node_or_null("AnimatedSprite2D")

	apply_appearance()

	direction = random_direction()
	direction_timer = randf_range(min_direction_time, max_direction_time)

	start_glow()


func _physics_process(delta: float) -> void:
	direction_timer -= delta

	if direction_timer <= 0.0:
		direction = random_direction()
		direction_timer = randf_range(min_direction_time, max_direction_time)

	velocity = direction * move_speed
	move_and_slide()

	if get_slide_collision_count() > 0:
		direction = random_direction()
		direction_timer = randf_range(min_direction_time, max_direction_time)


func random_direction() -> Vector2:
	var directions := [
		Vector2.RIGHT,
		Vector2.LEFT,
		Vector2.UP,
		Vector2.DOWN,
	]
	return directions.pick_random()


func apply_appearance() -> void:
	# Убираем золотой оттенок, оставляем белый
	modulate = Color.WHITE

	if not animated_sprite:
		return

	if not animated_sprite.sprite_frames:
		return

	if animation_name != "":
		if animated_sprite.sprite_frames.has_animation(animation_name):
			animated_sprite.play(animation_name)
	else:
		var names := animated_sprite.sprite_frames.get_animation_names()
		if names.size() > 0:
			animated_sprite.play(names[0])


func start_glow() -> void:
	if not animated_sprite:
		return

	# Пульсация размером вместо мигания цветом
	var tween := create_tween()
	tween.set_loops()
	
	tween.tween_property(
		animated_sprite,
		"scale",
		Vector2(1.2, 1.2),
		0.6
	)
	
	tween.tween_property(
		animated_sprite,
		"scale",
		Vector2.ONE,
		0.6
	)


func eat() -> void:
	rare_eaten.emit(reward)
	queue_free()
