import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../providers/payment_provider.dart';
import '../models/payment.dart';

class ReceiptScreen extends StatelessWidget {
  final Payment payment;

  const ReceiptScreen({super.key, required this.payment});

  @override
  Widget build(BuildContext context) {
    final provider = Provider.of<PaymentProvider>(context, listen: false);
    // Find the child name using childId from the payment
    final childName = provider.children
        .firstWhere((c) => c.id == payment.childId,
            orElse: () => provider.children.isNotEmpty
                ? provider.children.first
                : dynamic)
        .name;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Receipt'),
        automaticallyImplyLeading: false, // Prevent going back to payment form
      ),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              const Icon(
                Icons.check_circle_outline,
                color: Colors.green,
                size: 80,
              ),
              const SizedBox(height: 16),
              const Text(
                'Payment Successful!',
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF0D47A1),
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Thank you for your payment.',
                style: TextStyle(fontSize: 16, color: Colors.grey),
              ),
              const SizedBox(height: 32),
              Card(
                elevation: 4,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(20.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Transaction Details',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF0D47A1),
                        ),
                      ),
                      const Divider(height: 24, thickness: 1),
                      _buildDetailRow('Transaction ID', payment.id),
                      _buildDetailRow('Child Name', childName),
                      _buildDetailRow('Amount Paid', '\$${payment.amount.toStringAsFixed(2)}'),
                      _buildDetailRow('Date', payment.date),
                      _buildDetailRow('Payment Method', payment.paymentMethod),
                      _buildDetailRow('Status', 'Paid', isStatus: true),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 48),
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton(
                  onPressed: () {
                    // Navigate back to the home screen clearing navigation history
                    context.go('/home');
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF0D47A1),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                  child: const Text(
                    'Back to Home',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDetailRow(String label, String value, {bool isStatus = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: const TextStyle(fontSize: 15, color: Colors.grey, fontWeight: FontWeight.w500),
          ),
          Text(
            value,
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.bold,
              color: isStatus ? Colors.green : const Color(0xFF0D47A1),
            ),
          ),
        ],
      ),
    );
  }
}
