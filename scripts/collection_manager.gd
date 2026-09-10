extends Node

signal collection_updated

# Всего редких котов (должно совпадать с количеством конфигов)
const TOTAL_RARE_CATS := 7

# Список ID найденных редких котов
var found_cats: Array[int] = []


func _ready() -> void:
	found_cats.clear()
	
	# Подписываемся на сброс игры
	if AgeManager:
		AgeManager.game_reset.connect(reset_collection)


func add_found_cat(cat_id: int) -> void:
	if cat_id not in found_cats:
		found_cats.append(cat_id)
		collection_updated.emit()
		print("🐱 Найден редкий кот №", cat_id, "! Всего: ", found_cats.size(), "/", TOTAL_RARE_CATS)


func get_found_count() -> int:
	return found_cats.size()


func all_cats_found() -> bool:
	return found_cats.size() >= TOTAL_RARE_CATS


func reset_collection() -> void:
	found_cats.clear()
	collection_updated.emit()
