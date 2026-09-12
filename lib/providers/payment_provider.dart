import 'package:flutter/material.dart';
import '../models/user.dart';
import '../models/child.dart';
import '../models/payment.dart';

class PaymentProvider extends ChangeNotifier {
  User? _currentUser;
  final List<Child> _children = [];
  final List<Payment> _payments = [];

  User? get currentUser => _currentUser;
  List<Child> get children => _children;
  List<Payment> get payments => _payments;

  PaymentProvider() {
    // Initialize with mock data
    _children.add(Child(id: "1", name: "Jean Dupont", className: "CM1", schoolName: "Ecole Primaire A"));
    _children.add(Child(id: "2", name: "Marie Curie", className: "CE2", schoolName: "Ecole Primaire B"));

    _payments.add(Payment(id: "p1", childId: "1", amount: 50.0, date: "2023-10-01", status: PaymentStatus.Paid, paymentMethod: "Card"));
    _payments.add(Payment(id: "p2", childId: "2", amount: 75.0, date: "2023-10-05", status: PaymentStatus.Pending, paymentMethod: "Mobile Money"));
  }

  bool login(String phone, String password) {
    if (phone.isNotEmpty && password == "admin123") {
      final id = DateTime.now().millisecondsSinceEpoch.toString();
      _currentUser = User(id: id, name: "Parent Name", phone: phone, password: password);
      notifyListeners();
      return true;
    }
    return false;
  }

  void addChild(String name, String className, String schoolName) {
    final id = DateTime.now().millisecondsSinceEpoch.toString();
    final newChild = Child(id: id, name: name, className: className, schoolName: schoolName);
    _children.add(newChild);
    notifyListeners();
  }

  void processPayment(String childId, double amount, String method) {
    final id = DateTime.now().millisecondsSinceEpoch.toString();
    final newPayment = Payment(
      id: id,
      childId: childId,
      amount: amount,
      date: DateTime.now().toString().split(' ')[0],
      status: PaymentStatus.Paid,
      paymentMethod: method,
    );
    _payments.add(newPayment);
    notifyListeners();
  }
}
