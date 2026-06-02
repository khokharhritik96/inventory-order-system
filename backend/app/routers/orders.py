from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/orders", tags=["orders"])


@router.get("/", response_model=List[schemas.OrderOut])
def list_orders(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return (
        db.query(models.Order)
        .options(joinedload(models.Order.customer), joinedload(models.Order.items).joinedload(models.OrderItem.product))
        .order_by(models.Order.id.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.get("/{order_id}", response_model=schemas.OrderOut)
def get_order(order_id: int, db: Session = Depends(get_db)):
    order = (
        db.query(models.Order)
        .options(joinedload(models.Order.customer), joinedload(models.Order.items).joinedload(models.OrderItem.product))
        .filter(models.Order.id == order_id)
        .first()
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@router.post("/", response_model=schemas.OrderOut, status_code=status.HTTP_201_CREATED)
def create_order(payload: schemas.OrderCreate, db: Session = Depends(get_db)):
    customer = db.query(models.Customer).filter(models.Customer.id == payload.customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    if not payload.items:
        raise HTTPException(status_code=400, detail="Order must contain at least one item")

    # Aggregate quantities per product (so duplicate product_ids don't bypass stock checks)
    qty_by_product: dict[int, int] = {}
    for item in payload.items:
        qty_by_product[item.product_id] = qty_by_product.get(item.product_id, 0) + item.quantity

    # Load products and lock rows for update to prevent race conditions
    products = (
        db.query(models.Product)
        .filter(models.Product.id.in_(qty_by_product.keys()))
        .with_for_update()
        .all()
    )
    products_by_id = {p.id: p for p in products}

    missing = [pid for pid in qty_by_product if pid not in products_by_id]
    if missing:
        raise HTTPException(status_code=404, detail=f"Product(s) not found: {missing}")

    # Validate inventory before mutating anything
    for pid, qty in qty_by_product.items():
        product = products_by_id[pid]
        if product.stock < qty:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock for '{product.name}' (SKU: {product.sku}). Available: {product.stock}, Requested: {qty}",
            )

    # All validations passed - create order, deduct stock
    total_amount = 0.0
    order = models.Order(customer_id=payload.customer_id, status="pending", total_amount=0.0)
    db.add(order)
    db.flush()

    for item in payload.items:
        product = products_by_id[item.product_id]
        line_total = product.price * item.quantity
        total_amount += line_total
        db.add(models.OrderItem(
            order_id=order.id,
            product_id=product.id,
            quantity=item.quantity,
            unit_price=product.price,
        ))

    # Deduct aggregated quantities once per product
    for pid, qty in qty_by_product.items():
        products_by_id[pid].stock -= qty

    order.total_amount = round(total_amount, 2)
    db.commit()

    return (
        db.query(models.Order)
        .options(joinedload(models.Order.customer), joinedload(models.Order.items).joinedload(models.OrderItem.product))
        .filter(models.Order.id == order.id)
        .first()
    )


@router.patch("/{order_id}/status", response_model=schemas.OrderOut)
def update_order_status(order_id: int, payload: schemas.OrderStatusUpdate, db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    order.status = payload.status
    db.commit()
    db.refresh(order)
    return (
        db.query(models.Order)
        .options(joinedload(models.Order.customer), joinedload(models.Order.items).joinedload(models.OrderItem.product))
        .filter(models.Order.id == order.id)
        .first()
    )
