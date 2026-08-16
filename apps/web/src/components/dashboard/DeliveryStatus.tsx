import { handleInternalLink } from '../../app/use-route'
import type { DeliveryViewModel } from '../../lib/delivery'

export function DeliveryStatus({ delivery }: { delivery: DeliveryViewModel }) {
  return (
    <section className="delivery-status" aria-labelledby="delivery-title">
      <p className="overline">下一次交付</p>
      <h3 id="delivery-title">{delivery.headline}</h3>
      <p>{delivery.detail}</p>
      {delivery.action && (
        <div className="delivery-action-cta" style={{ marginTop: '0.85rem' }}>
          <a className="button button-sm" href={delivery.action.href} onClick={handleInternalLink}>
            {delivery.action.label}
          </a>
        </div>
      )}
    </section>
  )
}

