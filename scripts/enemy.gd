extends CharacterBody2D

# Имя анимации из SpriteFrames, например "enemy2_idle".
@export var animation_name := ""

# Перекрасить врага.
@export var enemy_color := Color.WHITE

# Скорость блуждания.
@export var move_speed := 60.0

# Через какое время враг меняет направление.
@export var min_direction_time := 0.8
@export var max_direction_time := 2.5

var animated_sprite: AnimatedSprite2D

var direction := Vector2.RIGHT
var direction_timer := 0.0


func _ready() -> void:
	add_to_group("enemy")

	animated_sprite = get_node_or_null("AnimatedSprite2D")

	apply_appearance()

	direction = random_direction()
	direction_timer = randf_range(min_direction_time, max_direction_time)


func _physics_process(delta: float) -> void:
	direction_timer -= delta

	if direction_timer <= 0.0:
		direction = random_direction()
		direction_timer = randf_range(min_direction_time, max_direction_time)

	velocity = direction * move_speed
	move_and_slide()

	# Если упёрся в стену, сразу идём в другую сторону.
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
	modulate = enemy_color

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


func eat() -> void:
	queue_free()
