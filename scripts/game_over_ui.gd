extends CanvasLayer

@onready var restart_button: TextureButton = $GameOverPanel/RestartButton
@onready var menu_button: TextureButton = $GameOverPanel/MenuButton

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	visible = false
	
	if restart_button:
		restart_button.pressed.connect(_on_restart_pressed)
	
	if menu_button:
		menu_button.pressed.connect(_on_menu_pressed)


func show_game_over() -> void:
	visible = true
	get_tree().paused = true


func _on_restart_pressed() -> void:
	print("🔄 Кнопка 'Заново' нажата")
	visible = false
	
	# Показываем коллекцию, после закрытия — рестарт
	var collection_screen := get_node_or_null("../FinalCollectionScreen")
	if collection_screen and collection_screen.has_method("show_collection"):
		collection_screen.show_collection(true)
	else:
		# Если экрана коллекции нет — сразу рестарт
		AgeManager.reset_game()
		get_tree().change_scene_to_file("res://scenes/main.tscn")


func _on_menu_pressed() -> void:
	print("📋 Кнопка 'В меню' нажата")
	visible = false
	
	# Показываем коллекцию, после закрытия — меню
	var collection_screen := get_node_or_null("../FinalCollectionScreen")
	if collection_screen and collection_screen.has_method("show_collection"):
		collection_screen.show_collection(false)
	else:
		_go_to_menu()


func _go_to_menu() -> void:
	get_tree().paused = false
	var main_menu_scene := preload("res://scenes/main_menu.tscn")
	get_tree().change_scene_to_packed(main_menu_scene)
