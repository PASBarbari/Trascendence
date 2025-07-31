import redis, json

r = redis.Redis(host='localhost', port=6379, db=0)

class RedisGameState:
    @staticmethod
    def key(game_id: str) -> str:
        return f"pong:game:{game_id}"

    @classmethod
    def load(cls, game_id: str) -> dict | None:
        raw = r.get(cls.key(game_id))
        return json.loads(raw) if raw else None

    @classmethod
    def save(cls, game_id: str, state: dict, ttl: int = 3600) -> None:
        r.setex(cls.key(game_id), ttl, json.dumps(state))

    @classmethod
    def delete(cls, game_id: str) -> None:
        r.delete(cls.key(game_id))


# analogous RedisTournamentState for live‐tournament persistence.
class RedisTournamentState:
    @staticmethod
    def key(tournament_id: str) -> str:
        return f"pong:tournament:{tournament_id}"

    @classmethod
    def load(cls, tournament_id: str) -> dict | None:
        raw = r.get(cls.key(tournament_id))
        return json.loads(raw) if raw else None

    @classmethod
    def save(cls, tournament_id: str, state: dict, ttl: int = 3600) -> None:
        r.setex(cls.key(tournament_id), ttl, json.dumps(state))

    @classmethod
    def delete(cls, tournament_id: str) -> None:
        r.delete(cls.key(tournament_id))