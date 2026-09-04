extends Node

@export var enemy_configs: Array[RareEnemyConfig] = []

@export var spawn_interval := 3.0
@export var max_rare_enemies := 20
@export var min_distance_from_player := 20.0

var spawn_timer: Timer


func _ready() -> void:
	spawn_timer = $SpawnTimer

	if spawn_timer == null:
		push_error("SpawnTimer не найден!")
		return

	spawn_timer.wait_time = spawn_interval
	spawn_timer.one_shot = false
	spawn_timer.autostart = false

	spawn_timer.timeout.connect(_on_spawn_timer_timeout)
	spawn_timer.start()


# ЭТА ФУНКЦИЯ ОТСУТСТВУЕТ - ДОБАВЬ ЕЁ!
func _on_spawn_timer_timeout() -> void:
	var alive := get_tree().get_nodes_in_group("rare_enemy").size()

	if alive < max_rare_enemies:
		spawn_rare_enemy()


func spawn_rare_enemy() -> void:
	if enemy_configs.is_empty():
		push_warning("Нет конфигураций редких врагов!")
		return

	var config := enemy_configs.pick_random() as RareEnemyConfig

	if config == null or config.enemy_scene == null:
		push_warning("Конфигурация или сцена врага не назначена!")
		return

	var player := get_tree().get_first_node_in_group("player")
	if player == null:
		return

	var spawn_points := get_node_or_null("../EnemySpawnPoints")
	if spawn_points == null:
		return

	var points := spawn_points.get_children()
	if points.is_empty():
		return

	var chosen: Node2D = null

	for attempt in range(12):
		var point := points.pick_random() as Node2D
		if point == null:
			continue

		if point.global_position.distance_to(player.global_position) >= min_distance_from_player:
			chosen = point
			break

	if chosen == null:
		chosen = points.pick_random() as Node2D

	if chosen == null:
		return

	# Создаём врага
	var enemy = config.enemy_scene.instantiate()

	# Применяем анимацию из конфига
	if config.animation_name != "":
		if enemy.has_node("AnimatedSprite2D"):
			var sprite = enemy.get_node("AnimatedSprite2D")
			if sprite.sprite_frames and sprite.sprite_frames.has_animation(config.animation_name):
				sprite.play(config.animation_name)
				print("Анимация: ", config.animation_name)

	# Подключаем сигнал
	if enemy.has_signal("rare_eaten"):
		enemy.rare_eaten.connect(func(value): _on_rare_eaten(value, config))

	get_tree().current_scene.add_child(enemy)
	enemy.global_position = chosen.global_position

	print("Заспавнен редкий враг: ", config.info_text)


func _on_rare_eaten(value: int, config: RareEnemyConfig) -> void:
	for i in range(value):
		AgeManager.eat_enemy()

	var info_ui := get_tree().get_first_node_in_group("rare_info_ui") as CanvasLayer

	if info_ui and info_ui.has_method("show_info_with_config"):
		info_ui.show_info_with_config(config)
