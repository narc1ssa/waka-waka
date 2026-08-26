extends Node2D

@export var pill_scene: PackedScene

# Спавнить таблетку, когда началась старость.
@export var spawn_on_old_age := true

# Спавнить таблетку заранее на определённой стадии.
# Для 5 стадий хорошо использовать 4 или 5.
# Если 0 - не спавнить по стадии.
@export var spawn_at_stage := 4

# Сколько таблеток одновременно может быть на уровне.
@export var max_active_pills := 2

# Отладочная клавиша для ручного спавна таблетки.
@export var debug_spawn_key := KEY_B

var ground: Sprite2D
var player_camera: Camera2D
var items: Node2D
var pill_spawn_points: Node2D

var active_pills := []


func _ready() -> void:
	ground = get_node_or_null("Ground")
	player_camera = get_node_or_null("Player/Camera2D")
	items = get_node_or_null("Items")
	pill_spawn_points = get_node_or_null("PillSpawnPoints")

	AgeManager.stage_changed.connect(_on_stage_changed)
	AgeManager.old_age_started.connect(_on_old_age_started)
	AgeManager.game_reset.connect(_on_game_reset)
	
	AudioManager.play_level_music()

	AgeManager.old_age_started.connect(_on_old_age_music)
	AgeManager.rejuvenated.connect(_on_level_music)
	AgeManager.game_reset.connect(_on_level_music)
	AgeManager.player_died_old_age.connect(_on_death_music)

func _on_old_age_music(_time_limit: float) -> void:
	AudioManager.play_old_age_music()


func _on_level_music(_a = null) -> void:
	AudioManager.play_level_music()


func _on_death_music() -> void:
	AudioManager.stop_music()
	
func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo:
		if event.keycode == debug_spawn_key:
			spawn_pill()


func _on_stage_changed(new_stage: int) -> void:
	if spawn_at_stage > 0 and new_stage == spawn_at_stage:
		spawn_pill()


func _on_old_age_started(_time_limit: float) -> void:
	if spawn_on_old_age:
		spawn_pill()


func _on_game_reset() -> void:
	clear_pills()


func spawn_pill() -> void:
	if pill_scene == null:
		push_warning("Pill scene is not assigned in Main")
		return

	_cleanup_pills()

	if active_pills.size() >= max_active_pills:
		return

	var spawn_position := Vector2.ZERO

	if pill_spawn_points:
		var points := pill_spawn_points.get_children()

		if not points.is_empty():
			var point := points.pick_random() as Node2D

			if point:
				spawn_position = point.global_position

	else:
		var player := get_node_or_null("Player")

		if player:
			spawn_position = player.global_position + Vector2(64, 0)

	var pill := pill_scene.instantiate()

	var parent: Node = self

	if items:
		parent = items

	parent.add_child(pill)

	pill.global_position = spawn_position

	active_pills.append(pill)

	pill.tree_exiting.connect(_on_pill_removed.bind(pill))


func _on_pill_removed(pill: Node) -> void:
	active_pills.erase(pill)


func _cleanup_pills() -> void:
	var valid_pills := []

	for pill in active_pills:
		if is_instance_valid(pill):
			valid_pills.append(pill)

	active_pills = valid_pills


func clear_pills() -> void:
	for pill in active_pills:
		if is_instance_valid(pill):
			pill.queue_free()

	active_pills.clear()
