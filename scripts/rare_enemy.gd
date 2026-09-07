extends CharacterBody2D

signal rare_eaten(value: int)

# Переменные для получения данных от спавнера
@export var forced_animation_name: String = ""
@export var forced_color: Color = Color.WHITE

# Старые переменные (как запасной вариант)
@export var animation_name: String = ""
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

	# Применяем внешний вид сразу при создании
	apply_appearance()

	direction = random_direction()
	direction_timer = randf_range(min_direction_time, max_direction_time)

	start_glow()
	print("✅ Редкий враг создан, группы: enemy + rare_enemy")


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
	# 1. Применяем цвет, переданный от спавнера
	modulate = forced_color

	if not animated_sprite or not animated_sprite.sprite_frames:
		return

	# 2. Определяем, какую анимацию играть
	var anim_to_play = forced_animation_name
	
	# Если спавнер не передал анимацию, пробуем взять из старых настроек
	if anim_to_play == "":
		anim_to_play = animation_name

	# Если всё ещё пусто, берём самую первую доступную в ресурсе
	if anim_to_play == "":
		var names := animated_sprite.sprite_frames.get_animation_names()
		if names.size() > 0:
			anim_to_play = names[0]

	# Запускаем анимацию
	if anim_to_play != "" and animated_sprite.sprite_frames.has_animation(anim_to_play):
		animated_sprite.play(anim_to_play)
		print("🎬 Враг внутри себя запустил анимацию: ", anim_to_play)


func start_glow() -> void:
	if not animated_sprite:
		return

	# Пульсация размером
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
	print("🎯 eat() вызван! reward = ", reward)
	rare_eaten.emit(reward)
	queue_free()
