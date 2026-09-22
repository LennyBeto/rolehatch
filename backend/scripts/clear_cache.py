# backend/scripts/clear_cache.py
from app.core.cache import clear_all_cache

if __name__ == "__main__":
    clear_all_cache()
    print("Cache cleared.")