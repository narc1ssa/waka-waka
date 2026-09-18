extends Node

@export var enemy_configs: Array[RareEnemyConfig] = []

@export var spawn_interval := 10.0
@export var max_rare_enemies := 5
@export var min_distance_from_player := 200.0

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
	
	print("=== RareEnemySpawner готов ===")
	print("Количество конфигов: ", enemy_configs.size())
	for i in range(enemy_configs.size()):
		var cfg = enemy_configs[i]
		if cfg:
			print("  Конфиг ", i, ": ", cfg.info_text, " | Анимация: '", cfg.animation_name, "'")


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

	# 1. Создаём врага
	var enemy = config.enemy_scene.instantiate() as CharacterBody2D

	# 2. ПЕРЕДАЁМ ДАННЫЕ ИЗ КОНФИГА ПРЯМО В ПЕРЕМЕННЫЕ ВРАГА
	enemy.forced_animation_name = config.animation_name
	
	enemy.forced_color = Color.WHITE

	# 3. Подключаем сигнал
	if enemy.has_signal("rare_eaten"):
		enemy.rare_eaten.connect(func(value): _on_rare_eaten(value, config))

	# 4. Добавляем на сцену
	get_tree().current_scene.add_child(enemy)
	enemy.global_position = chosen.global_position

	print("\n✅ Заспавнен редкий враг: ", config.info_text)
	print("   Анимация: ", config.animation_name)
	print("   Цвет: ", enemy.forced_color)


func _on_rare_eaten(value: int, config: RareEnemyConfig) -> void:
	print("\n=== РЕДКИЙ ВРАГ ПОЙМАН ===")
	print("Конфиг: ", config.info_text)
	print("Награда: ", value)
	
	for i in range(value):
		AgeManager.eat_enemy()

	# === ДОБАВЛЯЕМ В КОЛЛЕКЦИЮ ===
	var collection_manager := get_node_or_null("../CollectionManager")
	if collection_manager and collection_manager.has_method("add_found_cat"):
		# Находим ID кота (индекс в массиве конфигов)
		var cat_id := enemy_configs.find(config)
		if cat_id >= 0:
			collection_manager.add_found_cat(cat_id)
	# ============================

	var info_ui := get_tree().get_first_node_in_group("rare_info_ui") as CanvasLayer

	if info_ui and info_ui.has_method("show_info_with_config"):
		info_ui.show_info_with_config(config)
		print("✅ Карточка показана")
	else:
		print("❌ UI не найден!")
