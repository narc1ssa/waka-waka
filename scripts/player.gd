extends CharacterBody2D

@export var speed := 140.0

@onready var eat_area: Area2D = $EatArea

var stage_colors: Array[Color] = [
	Color(0.8, 1.0, 0.8),
	Color(0.6, 1.0, 0.6),
	Color(0.4, 0.9, 0.4),
	Color(0.2, 0.8, 0.2),
	Color(0.0, 0.7, 0.0),
	Color(0.9, 0.9, 0.5),
	Color(0.9, 0.8, 0.3),
	Color(0.9, 0.6, 0.2),
	Color(0.8, 0.4, 0.2),
	Color(0.7, 0.7, 0.7),
]


func _ready() -> void:
	add_to_group("player")

	eat_area.area_entered.connect(_on_eat_area_area_entered)

	AgeManager.stage_changed.connect(_on_stage_changed)
	AgeManager.player_died_old_age.connect(_on_player_died)
	AgeManager.game_reset.connect(_on_game_reset)

	_on_stage_changed(AgeManager.stage)


func _physics_process(delta: float) -> void:
	var input_vector := Vector2.ZERO

	input_vector.x = Input.get_axis("ui_left", "ui_right")
	input_vector.y = Input.get_axis("ui_up", "ui_down")

	velocity = input_vector.normalized() * speed
	move_and_slide()


func _on_eat_area_area_entered(area: Area2D) -> void:
	if area.is_in_group("enemy"):
		AgeManager.eat_enemy()

		if area.has_method("eat"):
			area.eat()
		else:
			area.queue_free()


func _on_stage_changed(new_stage: int) -> void:
	var index := new_stage - 1

	if index >= 0 and index < stage_colors.size():
		modulate = stage_colors[index]


func _on_player_died() -> void:
	set_physics_process(false)


func _on_game_reset() -> void:
	set_physics_process(true)
