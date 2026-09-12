import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../providers/payment_provider.dart';
import '../models/child.dart';

class PaymentScreen extends StatefulWidget {
  final String? initialChildId;

  const PaymentScreen({super.key, this.initialChildId});

  @override
  State<PaymentScreen> createState() => _PaymentScreenState();
}

class _PaymentScreenState extends State<PaymentScreen> {
  final _formKey = GlobalKey<FormState>();
  final _amountController = TextEditingController();
  String? _selectedChildId;
  String _selectedMethod = 'Mobile Money';

  final List<String> _paymentMethods = ['Mobile Money', 'Card', 'Cash'];

  @override
  void initState() {
    super.initState();
    _selectedChildId = widget.initialChildId;

    // Fallback if initialChildId is not provided or valid
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final provider = Provider.of<PaymentProvider>(context, listen: false);
      if (_selectedChildId == null && provider.children.isNotEmpty) {
        setState(() {
          _selectedChildId = provider.children.first.id;
        });
      }
    });
  }

  @override
  void dispose() {
    _amountController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('New Payment'),
      ),
      body: Consumer<PaymentProvider>(
        builder: (context, provider, child) {
          if (provider.children.isEmpty) {
            return const Center(
              child: Padding(
                padding: EdgeInsets.all(16.0),
                child: Text(
                  'Please add a child first before making a payment.',
                  style: TextStyle(fontSize: 16),
                  textAlign: Center,
                ),
              ),
            );
          }

          // Ensure selected child ID is valid within current children list
          if (_selectedChildId == null || !provider.children.any((c) => c.id == _selectedChildId)) {
            _selectedChildId = provider.children.first.id;
          }

          return SingleChildScrollView(
            padding: const EdgeInsets.all(16.0),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Select Child',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF0D47A1),
                    ),
                  ),
                  const SizedBox(height: 8),
                  DropdownButtonFormField<String>(
                    value: _selectedChildId,
                    decoration: InputDecoration(
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 16),
                    ),
                    items: provider.children.map((Child child) {
                      return DropdownMenuItem<String>(
                        value: child.id,
                        child: Text('${child.name} (${child.className})'),
                      );
                    }).toList(),
                    onChanged: (value) {
                      setState(() {
                        _selectedChildId = value;
                      });
                    },
                  ),
                  const SizedBox(height: 24),
                  const Text(
                    'Payment Amount',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF0D47A1),
                    ),
                  ),
                  const SizedBox(height: 8),
                  TextFormField(
                    controller: _amountController,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    decoration: InputDecoration(
                      hintText: 'Enter amount (e.g. 50.00)',
                      prefixIcon: const Icon(Icons.attach_money, color: Color(0xFF0D47A1)),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                    validator: (value) {
                      if (value == null || value.trim().isEmpty) {
                        return 'Amount is required';
                      }
                      final amount = double.tryParse(value);
                      if (amount == null || amount <= 0) {
                        return 'Please enter a valid positive amount';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 24),
                  const Text(
                    'Payment Method',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF0D47A1),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Card(
                    elevation: 1,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                      side: BorderSide(color: Colors.grey.shade300),
                    ),
                    child: Column(
                      children: _paymentMethods.map((method) {
                        return RadioListTile<String>(
                          title: Text(method),
                          value: method,
                          groupValue: _selectedMethod,
                          activeColor: const Color(0xFF0D47A1),
                          onChanged: (value) {
                            setState(() {
                              _selectedMethod = value!;
                            });
                          },
                        );
                      }).toList(),
                    ),
                  ),
                  const SizedBox(height: 40),
                  SizedBox(
                    width: double.infinity,
                    height: 50,
                    child: ElevatedButton(
                      onPressed: () {
                        if (_formKey.currentState!.validate() && _selectedChildId != null) {
                          final amount = double.parse(_amountController.text);

                          // Process the payment in provider
                          provider.processPayment(_selectedChildId!, amount, _selectedMethod);

                          // Get the processed payment (last one added)
                          final latestPayment = provider.payments.last;

                          // Navigate to receipt screen
                          context.push('/receipt', extra: latestPayment);
                        }
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF0D47A1),
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                      child: const Text(
                        'Confirm Payment',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
