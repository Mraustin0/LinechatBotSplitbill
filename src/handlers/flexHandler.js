function billSummaryFlex(bill, shares) {
  const totalPaid = shares.filter((s) => s.paid).reduce((sum, s) => sum + s.amount, 0);
  const allPaid = shares.length > 0 && shares.every((s) => s.paid);

  const rows = shares.map((s) => ({
    type: 'box',
    layout: 'horizontal',
    contents: [
      {
        type: 'box',
        layout: 'vertical',
        flex: 3,
        contents: [
          { type: 'text', text: s.user.display_name, size: 'sm', color: '#333333', weight: 'bold' },
        ],
      },
      {
        type: 'text',
        text: `฿${s.amount.toLocaleString()}`,
        size: 'sm',
        color: '#111111',
        flex: 2,
        align: 'end',
        gravity: 'center',
      },
      {
        type: 'box',
        layout: 'vertical',
        flex: 1,
        contents: [
          {
            type: 'text',
            text: s.paid ? '✅' : '⏳',
            align: 'end',
            gravity: 'center',
          },
        ],
      },
    ],
    paddingTop: '10px',
    paddingBottom: '10px',
    borderWidth: '1px',
    borderColor: '#f0f0f0',
  }));

  return {
    type: 'flex',
    altText: `📋 ${bill.title} — ดูสรุปบิล`,
    contents: {
      type: 'bubble',
      size: 'kilo',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#06C755',
        paddingAll: '20px',
        contents: [
          {
            type: 'text',
            text: bill.title,
            color: '#ffffff',
            weight: 'bold',
            size: 'xl',
          },
          {
            type: 'box',
            layout: 'horizontal',
            margin: '8px',
            contents: [
              { type: 'text', text: 'ยอดรวม', color: '#d4f5d4', size: 'sm', flex: 1 },
              {
                type: 'text',
                text: `฿${bill.total.toLocaleString()}`,
                color: '#ffffff',
                size: 'sm',
                weight: 'bold',
                align: 'end',
                flex: 1,
              },
            ],
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: 'จ่ายแล้ว', color: '#d4f5d4', size: 'sm', flex: 1 },
              {
                type: 'text',
                text: `฿${totalPaid.toLocaleString()}`,
                color: '#ffffff',
                size: 'sm',
                weight: 'bold',
                align: 'end',
                flex: 1,
              },
            ],
          },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '16px',
        contents: [
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: 'ชื่อ', size: 'xs', color: '#aaaaaa', flex: 3, weight: 'bold' },
              { type: 'text', text: 'ยอด', size: 'xs', color: '#aaaaaa', flex: 2, align: 'end', weight: 'bold' },
              { type: 'text', text: '', flex: 1 },
            ],
          },
          { type: 'separator', margin: '8px' },
          ...rows,
          ...(allPaid
            ? [
                { type: 'separator', margin: '12px' },
                {
                  type: 'text',
                  text: '🎉 ทุกคนจ่ายครบแล้ว!',
                  color: '#06C755',
                  weight: 'bold',
                  align: 'center',
                  margin: '12px',
                },
              ]
            : []),
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '12px',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#06C755',
            height: 'sm',
            action: {
              type: 'postback',
              label: '✅  ฉันจ่ายแล้ว',
              data: `action=paid&bill_id=${bill.id}`,
            },
          },
        ],
      },
    },
  };
}

module.exports = { billSummaryFlex };
