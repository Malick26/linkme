package com.linkme.api.shop;

import com.linkme.api.config.AppProperties;
import com.linkme.api.shop.ShopDtos.DayEarnings;
import com.linkme.api.shop.ShopDtos.Earnings;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class EarningsService {
    private final OrderRepository orders;
    private final AppProperties props;
    private final Clock clock;

    public EarningsService(OrderRepository orders, AppProperties props, Clock clock) {
        this.orders = orders;
        this.props = props;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public Earnings earnings(UUID creatorId) {
        List<ShopOrder> paid = orders.findByCreatorIdAndStatus(creatorId, OrderStatus.PAID);
        long gross = 0;
        long commission = 0;
        long net = 0;
        long pending = 0;
        long paidOut = 0;
        for (ShopOrder o : paid) {
            gross += o.getAmountXof();
            commission += o.getCommissionXof();
            net += o.getNetXof();
            if (o.getPayoutStatus() == PayoutStatus.PENDING_PAYOUT) pending += o.getNetXof();
            if (o.getPayoutStatus() == PayoutStatus.PAID_OUT) paidOut += o.getNetXof();
        }
        LocalDate today = LocalDate.ofInstant(clock.instant(), ZoneOffset.UTC);
        LocalDate first = today.minusDays(29);
        Map<LocalDate, long[]> byDay = new HashMap<>();
        for (ShopOrder o : orders.paidSince(creatorId, first.atStartOfDay(ZoneOffset.UTC).toInstant())) {
            long[] v = byDay.computeIfAbsent(LocalDate.ofInstant(o.getPaidAt(), ZoneOffset.UTC), d -> new long[2]);
            v[0] += o.getNetXof();
            v[1]++;
        }
        List<DayEarnings> days = new ArrayList<>();
        for (LocalDate d = first; !d.isAfter(today); d = d.plusDays(1)) {
            long[] v = byDay.getOrDefault(d, new long[2]);
            days.add(new DayEarnings(d, v[0], (int) v[1]));
        }
        return new Earnings(gross, commission, net, pending, paidOut, paid.size(), props.commissionPercent(), days);
    }
}
