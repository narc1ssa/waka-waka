extends Node

@export var enemy_scene: PackedScene

# Какие анимации могут получать враги при спавне.
@export var animation_names: Array[String] = []

# Если заполнить, враги будут получать случайный цвет.
@export var enemy_colors: Array[Color] = []

# Сколько врагов создать сразу при старте.
@export var initial_enemies := 5

# Максимум врагов на уровне одновременно.
@export var max_enemies := 10

# Как часто пытаться доспавнить врага.
@export var spawn_interval := 3.0

# Не спавнить врагов ближе этого расстояния к игроку.
@export var min_distance_from_player := 120.0

var enemies_node: Node2D
var spawn_points: Node2D
var spawn_timer: Timer


func _ready() -> void:
	enemies_node = get_node_or_null("../Enemies")
	spawn_points = get_node_or_null("../EnemySpawnPoints")

	spawn_timer = Timer.new()
	spawn_timer.wait_time = spawn_interval
	spawn_timer.timeout.connect(_on_spawn_timer_timeout)
	add_child(spawn_timer)

	AgeManager.game_reset.connect(_on_game_reset)
	AgeManager.player_died_old_age.connect(_on_player_died)

	spawn_timer.start()
	_spawn_initial()


func _spawn_initial() -> void:
	for i in range(initial_enemies):
		spawn_enemy()


func _on_spawn_timer_timeout() -> void:
	var alive := get_tree().get_nodes_in_group("enemy").size()

	if alive < max_enemies:
		spawn_enemy()


func _on_player_died() -> void:
	spawn_timer.stop()


func _on_game_reset() -> void:
	for enemy in get_tree().get_nodes_in_group("enemy"):
		if is_instance_valid(enemy):
			enemy.queue_free()

	await get_tree().process_frame

	_spawn_initial()
	spawn_timer.start()


func spawn_enemy() -> void:
	if enemy_scene == null:
		push_warning("Enemy scene is not assigned in EnemySpawner")
		return

	if spawn_points == null:
		push_warning("No EnemySpawnPoints node found")
		return

	var points := spawn_points.get_children()

	if points.is_empty():
		push_warning("No spawn points inside EnemySpawnPoints")
		return

	var player := get_tree().get_first_node_in_group("player")

	var chosen: Node2D = null

	# Пытаемся найти точку подальше от игрока.
	for attempt in range(8):
		var point := points.pick_random() as Node2D

		if point == null:
			continue

		if player == null:
			chosen = point
			break

		if point.global_position.distance_to(player.global_position) >= min_distance_from_player:
			chosen = point
			break

	# Если далеко не нашли, спавним хотя бы где-то.
	if chosen == null:
		chosen = points.pick_random() as Node2D

	if chosen == null:
		return

	var enemy = enemy_scene.instantiate()

	if animation_names.size() > 0:
		enemy.animation_name = animation_names[randi() % animation_names.size()]

	if enemy_colors.size() > 0:
		enemy.enemy_color = enemy_colors[randi() % enemy_colors.size()]

	var parent: Node = enemies_node if enemies_node != null else get_parent()

	parent.add_child(enemy)
	enemy.global_position = chosen.global_position
