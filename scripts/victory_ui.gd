extends CanvasLayer

@onready var victory_panel: Panel = $VictoryPanel


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS

	victory_panel.visible = false

	AgeManager.victory.connect(_on_victory)

	$VictoryPanel/RestartButton.pressed.connect(_on_restart)
	$VictoryPanel/MenuButton.pressed.connect(_on_menu)


func _on_victory() -> void:
	victory_panel.visible = true
	AudioManager.play_win_music()
	get_tree().paused = true


func _on_restart() -> void:
	get_tree().paused = false
	AgeManager.reset_game()
	get_tree().change_scene_to_file("res://scenes/main.tscn")


func _on_menu() -> void:
	get_tree().paused = false
	AgeManager.reset_game()
	get_tree().change_scene_to_file("res://scenes/main_menu.tscn")
