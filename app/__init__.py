"""Application factory for the Store Management System."""

import os

from flask import Flask

from . import db


def create_app(test_config: dict | None = None) -> Flask:
    app = Flask(__name__, instance_relative_config=True)
    app.config.from_mapping(
        SECRET_KEY=os.environ.get("SECRET_KEY", "dev-secret-change-me"),
        DATABASE=os.path.join(app.instance_path, "store.sqlite3"),
        SEED_DATA=True,
    )

    if test_config:
        app.config.update(test_config)

    os.makedirs(app.instance_path, exist_ok=True)

    db.init_app(app)

    from .crud import register_crud_blueprints
    from .dashboard import bp as dashboard_bp
    from .products import bp as products_bp
    from .reports import bp as reports_bp
    from .sales import bp as sales_bp

    app.register_blueprint(dashboard_bp)
    app.register_blueprint(products_bp)
    app.register_blueprint(sales_bp)
    app.register_blueprint(reports_bp)
    register_crud_blueprints(app)

    @app.template_filter("money")
    def money(value) -> str:
        return f"{float(value or 0):,.2f}"

    with app.app_context():
        db.init_db(seed=app.config["SEED_DATA"])

    return app
