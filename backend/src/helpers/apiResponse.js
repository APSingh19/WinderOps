export const ok = (res, data, message = 'OK') => res.json({ success: true, message, data });

export const created = (res, data, message = 'Created') => res.status(201).json({ success: true, message, data });

export const paginated = (res, { items, total, page, limit }, message = 'OK') =>
  res.json({
    success: true,
    message,
    data: items,
    meta: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit) || 1
    }
  });
