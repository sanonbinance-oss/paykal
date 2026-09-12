import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/payment_provider.dart';
import '../models/payment.dart';

class HistoryScreen extends StatelessWidget {
  const HistoryScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Payment History'),
      ),
      body: Consumer<PaymentProvider>(
        builder: (context, provider, child) {
          if (provider.payments.isEmpty) {
            return const Center(
              child: Text('No payment history found.'),
            );
          }

          return ListView.builder(
            padding: const EdgeInsets.all(16.0),
            itemCount: provider.payments.length,
            itemBuilder: (context, index) {
              final payment = provider.payments[index];
              final childObj = provider.children.firstWhere(
                (c) => c.id == payment.childId,
                orElse: () => provider.children.isNotEmpty ? provider.children.first : provider.children.first, // Fallback logic
              );

              // Find the actual child name if possible
              String childName = "Unknown";
              try {
                childName = provider.children.firstWhere((c) => c.id == payment.childId).name;
              } catch (e) {
                childName = "Child #${payment.childId}";
              }

              return Card(
                margin: const EdgeInsets.only(bottom: 12),
                child: ListTile(
                  title: Text(
                    childName,
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                  subtitle: Text('${payment.date} - ${payment.paymentMethod}'),
                  trailing: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        '${payment.amount.toStringAsFixed(2)} €',
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: payment.status == PaymentStatus.Paid
                              ? Colors.green.withOpacity(0.2)
                              : Colors.orange.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          payment.status.name,
                          style: TextStyle(
                            color: payment.status == PaymentStatus.Paid
                                ? Colors.green
                                : Colors.orange,
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          );
        },
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: 1,
        onTap: (index) {
          if (index == 0) {
            context.go('/home');
          }
        },
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.home),
            label: 'Home',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.history),
            label: 'History',
          ),
        ],
      ),
    );
  }
}
