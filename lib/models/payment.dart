enum PaymentStatus { Paid, Pending }

class Payment {
  final String id;
  final String childId;
  final double amount;
  final String date;
  final PaymentStatus status;
  final String paymentMethod;

  Payment({
    required this.id,
    required this.childId,
    required this.amount,
    required this.date,
    required this.status,
    required this.paymentMethod,
  });
}
