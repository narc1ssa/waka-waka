extends Node2D

@export var pill_scene: PackedScene

# Спавнить таблетку, когда началась старость.
@export var spawn_on_old_age := true

# Спавнить таблетку заранее на определённой стадии.
# Если 0 - не спавнить по стадии.
@export var spawn_at_stage := 5

# Сколько таблеток одновременно может быть на уровне.
@export var max_active_pills := 1

# Отладочная клавиша для ручного спавна таблетки.
@export var debug_spawn_key := KEY_B

@onready var items: Node2D = $Items
@onready var pill_spawn_points: Node2D = $PillSpawnPoints

var active_pills := []


func _ready() -> void:
	AgeManager.stage_changed.connect(_on_stage_changed)
	AgeManager.old_age_started.connect(_on_old_age_started)
	AgeManager.game_reset.connect(_on_game_reset)


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

	var pill := pill_scene.instantiate()

	items.add_child(pill)
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
