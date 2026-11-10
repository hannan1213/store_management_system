"""Generic CRUD blueprints for the simple lookup tables."""

from flask import Blueprint, flash, redirect, render_template, request, url_for

from .db import delete, insert, query, query_one, update


def _coerce(field: dict, raw: str):
    if field["type"] == "number":
        if raw in (None, ""):
            return None
        value = float(raw)
        return int(value) if value.is_integer() and field.get("integer") else value
    raw = (raw or "").strip()
    return raw or None


def _read_form(fields: list[dict]) -> tuple[dict, list[str]]:
    data, errors = {}, []
    for field in fields:
        raw = request.form.get(field["key"])
        if field.get("required") and not (raw or "").strip():
            errors.append(f"{field['label']} is required.")
            continue
        try:
            data[field["key"]] = _coerce(field, raw)
        except ValueError:
            errors.append(f"{field['label']} must be a number.")
    return data, errors


def _search_clause(search_fields: list[str], term: str) -> tuple[str, list[str]]:
    if not term or not search_fields:
        return "", []
    clause = " OR ".join(f"{field} LIKE ?" for field in search_fields)
    return f" WHERE ({clause})", [f"%{term}%"] * len(search_fields)


def make_crud_blueprint(
    name: str,
    table: str,
    title: str,
    singular: str,
    fields: list[dict],
    columns: list[tuple[str, str]],
    search_fields: list[str] | None = None,
) -> Blueprint:
    """Build a list/create/edit/delete blueprint for a single table."""

    bp = Blueprint(name, __name__, url_prefix=f"/{name}")

    def render_list():
        term = request.args.get("q", "").strip()
        where, args = _search_clause(search_fields or [], term)
        rows = query(f"SELECT * FROM {table}{where} ORDER BY name COLLATE NOCASE", args)
        return render_template(
            "crud/list.html",
            name=name,
            title=title,
            singular=singular,
            columns=columns,
            rows=rows,
            q=term,
            searchable=bool(search_fields),
        )

    @bp.route("/")
    def index():
        return render_list()

    @bp.route("/new", methods=("GET", "POST"))
    def create():
        if request.method == "POST":
            data, errors = _read_form(fields)
            if not errors:
                try:
                    insert(table, data)
                except Exception as exc:  # unique/schema violations surface here
                    errors.append(str(exc))
            if errors:
                for message in errors:
                    flash(message, "error")
                return render_template("crud/form.html", name=name, title=title,
                                       singular=singular, fields=fields, item=None)
            flash(f"{singular} added.", "success")
            return redirect(url_for(f"{name}.index"))

        return render_template("crud/form.html", name=name, title=title,
                               singular=singular, fields=fields, item=None)

    @bp.route("/<int:item_id>/edit", methods=("GET", "POST"))
    def edit(item_id: int):
        item = query_one(f"SELECT * FROM {table} WHERE id = ?", (item_id,))
        if item is None:
            flash(f"{singular} not found.", "error")
            return redirect(url_for(f"{name}.index"))

        if request.method == "POST":
            data, errors = _read_form(fields)
            if not errors:
                try:
                    update(table, item_id, data)
                except Exception as exc:
                    errors.append(str(exc))
            if errors:
                for message in errors:
                    flash(message, "error")
                return render_template("crud/form.html", name=name, title=title,
                                       singular=singular, fields=fields, item=item)
            flash(f"{singular} updated.", "success")
            return redirect(url_for(f"{name}.index"))

        return render_template("crud/form.html", name=name, title=title,
                               singular=singular, fields=fields, item=item)

    @bp.route("/<int:item_id>/delete", methods=("POST",))
    def remove(item_id: int):
        try:
            delete(table, item_id)
            flash(f"{singular} deleted.", "success")
        except Exception as exc:
            flash(f"Cannot delete this {singular.lower()}: {exc}", "error")
        return redirect(url_for(f"{name}.index"))

    return bp


def register_crud_blueprints(app) -> None:
    app.register_blueprint(make_crud_blueprint(
        name="categories",
        table="categories",
        title="Categories",
        singular="Category",
        fields=[
            {"key": "name", "label": "Name", "type": "text", "required": True},
            {"key": "description", "label": "Description", "type": "textarea"},
        ],
        columns=[("name", "Name"), ("description", "Description")],
        search_fields=["name", "description"],
    ))

    app.register_blueprint(make_crud_blueprint(
        name="suppliers",
        table="suppliers",
        title="Suppliers",
        singular="Supplier",
        fields=[
            {"key": "name", "label": "Company name", "type": "text", "required": True},
            {"key": "contact_person", "label": "Contact person", "type": "text"},
            {"key": "phone", "label": "Phone", "type": "tel"},
            {"key": "email", "label": "Email", "type": "email"},
            {"key": "address", "label": "Address", "type": "textarea"},
        ],
        columns=[("name", "Company"), ("contact_person", "Contact"),
                 ("phone", "Phone"), ("email", "Email")],
        search_fields=["name", "contact_person", "phone", "email"],
    ))

    app.register_blueprint(make_crud_blueprint(
        name="customers",
        table="customers",
        title="Customers",
        singular="Customer",
        fields=[
            {"key": "name", "label": "Full name", "type": "text", "required": True},
            {"key": "phone", "label": "Phone", "type": "tel"},
            {"key": "email", "label": "Email", "type": "email"},
            {"key": "address", "label": "Address", "type": "textarea"},
        ],
        columns=[("name", "Name"), ("phone", "Phone"),
                 ("email", "Email"), ("address", "Address")],
        search_fields=["name", "phone", "email"],
    ))
