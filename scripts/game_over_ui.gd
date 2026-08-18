extends CanvasLayer

@onready var game_over_panel: Panel = $GameOverPanel


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS

	game_over_panel.visible = false

	AgeManager.player_died_old_age.connect(_on_player_died)
	AgeManager.game_reset.connect(_on_game_reset)

	$GameOverPanel/VBoxContainer/RestartButton.pressed.connect(_on_restart)
	$GameOverPanel/VBoxContainer/MenuButton.pressed.connect(_on_menu)


func _on_player_died() -> void:
	game_over_panel.visible = true


func _on_game_reset() -> void:
	game_over_panel.visible = false


func _on_restart() -> void:
	AgeManager.reset_game()
	get_tree().change_scene_to_file("res://scenes/main.tscn")


func _on_menu() -> void:
	AgeManager.reset_game()
	get_tree().change_scene_to_file("res://scenes/main_menu.tscn")
