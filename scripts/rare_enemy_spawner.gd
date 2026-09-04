extends Node

@export var rare_enemy_scene: PackedScene
@export var animation_names: Array[String] = []

# Как часто спавнить редкого врага (в секундах)
@export var spawn_interval := 5.0

# Максимум редких врагов на карте
@export var max_rare_enemies := 2

# Не спавнить ближе к игроку
@export var min_distance_from_player := 200.0
@export var rare_enemy_image: Texture2D

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

	print("RareEnemySpawner: таймер запущен, интервал = ", spawn_interval)


func _on_spawn_timer_timeout() -> void:
	var alive := get_tree().get_nodes_in_group("rare_enemy").size()

	if alive < max_rare_enemies:
		spawn_rare_enemy()


func spawn_rare_enemy() -> void:
	if rare_enemy_scene == null:
		return

	var player := get_tree().get_first_node_in_group("player")
	if player == null:
		return

	# Выбираем случайную точку спавна (используем те же точки, что и обычные враги)
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

	var enemy = rare_enemy_scene.instantiate()

	if animation_names.size() > 0:
		enemy.animation_name = animation_names[randi() % animation_names.size()]

	# Подключаем сигнал награды
	if enemy.has_signal("rare_eaten"):
		enemy.rare_eaten.connect(_on_rare_eaten)

	get_parent().add_child(enemy)
	enemy.global_position = chosen.global_position

	# Звук появления редкого врага
	AudioManager.play_rare_spawn_sfx()


func _on_rare_eaten(value: int) -> void:
	print(" _on_rare_eaten вызван! value = ", value)
	
	for i in range(value):
		AgeManager.eat_enemy()
	
	var info_ui := get_tree().get_first_node_in_group("rare_info_ui") as CanvasLayer
	print("🔍 info_ui найден: ", info_ui != null)
	
	if info_ui and info_ui.has_method("show_info"):
		print("📢 Вызываю show_info...")
		info_ui.show_info("Редкий кот!", value)
	else:
		push_warning("UI не найден или нет метода show_info!")
