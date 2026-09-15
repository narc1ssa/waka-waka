extends CanvasLayer

@onready var background: TextureRect = $Background
@onready var close_button: TextureButton = $CloseButton

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	
	# Проверяем, нужно ли показывать инструкции
	var main_node := get_node_or_null("..")
	if main_node and main_node.has_method("should_show_tutorial"):
		if not main_node.should_show_tutorial():
			visible = false
			get_tree().paused = false
			return
	
	visible = true
	get_tree().paused = true
	
	if close_button:
		close_button.pressed.connect(_on_close_pressed)


func _on_close_pressed() -> void:
	print("📖 Инструкции закрыты")
	visible = false
	get_tree().paused = false
