extends CanvasLayer

# Массив текстур для найденных котов (7 штук)
@export var cat_found_textures: Array[Texture2D]

@onready var background: TextureRect = $Background
@onready var title_label: Label = $TitleLabel
@onready var continue_button: Button = $ContinueButton

var cat_slots: Array[TextureRect] = []
var collection_manager: Node
var restart_after_close := false


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	
	visible = false
	
	_find_cat_slots()
	
	if continue_button:
		continue_button.pressed.connect(_on_continue)
	
	await get_tree().create_timer(0.1).timeout
	collection_manager = get_node_or_null("../CollectionManager")


func _find_cat_slots() -> void:
	cat_slots.clear()
	
	for i in range(1, 8):
		var slot_name = "CatSlot" + str(i)
		var slot = get_node_or_null(slot_name) as TextureRect
		if slot:
			cat_slots.append(slot)
		else:
			push_warning("Не найден слот: " + slot_name)
	
	print("🎯 Найдено слотов: ", cat_slots.size())


func show_collection(restart_after := false) -> void:
	restart_after_close = restart_after
	
	if not collection_manager:
		push_warning("CollectionManager не найден!")
		return
	
	visible = true
	get_tree().paused = true
	
	_update_cat_slots()
	
	# Показываем заголовок
	var all_found = collection_manager.all_cats_found()
	
	if all_found:
		title_label.text = "🎉 ALL CATS COLLECTED! 🎉"
		title_label.modulate = Color.GOLD
	else:
		title_label.text = "Cats collected: %d / %d" % [
			collection_manager.get_found_count(),
			collection_manager.TOTAL_RARE_CATS
		]
		title_label.modulate = Color.WHITE
	
	print("📊 Финальный экран: найдено ", collection_manager.get_found_count(), "/", collection_manager.TOTAL_RARE_CATS)


func _update_cat_slots() -> void:
	var found_cats: Array[int] = collection_manager.found_cats
	
	print("🐱 Обновляем слоты. Найдены коты: ", found_cats)
	
	for i in range(cat_slots.size()):
		var slot = cat_slots[i]
		
		if i in found_cats:
			# Кот найден — показываем его картинку поверх силуэта
			if i < cat_found_textures.size() and cat_found_textures[i]:
				slot.texture = cat_found_textures[i]
				slot.modulate = Color.WHITE
				print("  Слот ", i + 1, ": кот найден ✅")
			else:
				print("  Слот ", i + 1, ": нет текстуры найденного кота!")
		else:
			# Кот не найден — оставляем слот пустым, виден силуэт фона
			slot.texture = null
			slot.modulate = Color.WHITE
			print("  Слот ", i + 1, ": кот не найден ❌ (виден силуэт)")


func _on_continue() -> void:
	visible = false
	get_tree().paused = false
	
	if restart_after_close:
		# Перезапуск игры
		print("🔄 Перезапуск после коллекции")
		AgeManager.reset_game()
		get_tree().change_scene_to_file("res://scenes/main.tscn")
	else:
		# Переход в меню
		print("📋 Переход в меню после коллекции")
		var main_menu_scene := preload("res://scenes/main_menu.tscn")
		get_tree().change_scene_to_packed(main_menu_scene)
