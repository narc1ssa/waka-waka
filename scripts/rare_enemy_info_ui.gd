extends CanvasLayer

@onready var info_panel: Panel = $InfoPanel
@onready var close_button: TextureButton = $InfoPanel/CloseButton
@onready var info_image: TextureRect = $InfoPanel/InfoImage
@onready var info_text: Label = $InfoPanel/InfoText

var is_visible := false


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	
	add_to_group("rare_info_ui")
	
	info_panel.visible = false
	
	var dim := get_node_or_null("InfoPanel/Dim") as ColorRect
	if dim:
		dim.mouse_filter = Control.MOUSE_FILTER_STOP
		dim.gui_input.connect(_on_dim_clicked)
	
	if close_button:
		close_button.pressed.connect(_on_close)


# Новая функция для работы с конфигом
func show_info_with_config(config: RareEnemyConfig) -> void:
	# Устанавливаем картинку КОНКРЕТНОГО врага
	info_image.texture = config.enemy_image
	
	# Устанавливаем текст
	info_text.text = "%s\n+%d cats!" % [config.info_text, config.reward]
	
	info_panel.visible = true
	is_visible = true
	
	get_tree().paused = true


# Старая функция (для совместимости)
func show_info(text: String, reward: int) -> void:
	info_text.text = "%s\n+%d cats!" % [text, reward]
	
	info_panel.visible = true
	is_visible = true
	
	get_tree().paused = true


func _on_dim_clicked(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		_on_close()


func _on_close() -> void:
	if not is_visible:
		return
	
	info_panel.visible = false
	is_visible = false
	
	get_tree().paused = false
