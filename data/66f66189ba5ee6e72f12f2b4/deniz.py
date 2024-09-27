import random

def experiment_one():
    iteration_count = 0
    while True:
        iteration_count += 1
        num = random.randint(0, 3)
        if num == 0:
            return iteration_count

def experiment_two():
    iteration_count = 0
    while True:
        iteration_count += 1
        nums = [random.randint(0, 3) for _ in range(4)]
        if 0 in nums:
            return iteration_count

# Running both experiments 1000 times
def run_experiments():
    exp_one_iterations = []
    exp_two_iterations = []
    
    with open("single.txt", "w") as single_file, open("multi.txt", "w") as multi_file:
        for _ in range(10000):
            # Run experiment one and record the result
            exp_one_iters = experiment_one()
            single_file.write(f"{exp_one_iters}\n")
            exp_one_iterations.append(exp_one_iters)
            
            # Run experiment two and record the result
            exp_two_iters = experiment_two()
            multi_file.write(f"{exp_two_iters}\n")
            exp_two_iterations.append(exp_two_iters)
    
    # Calculating the average number of iterations for both experiments
    avg_exp_one = sum(exp_one_iterations) / len(exp_one_iterations)
    avg_exp_two = sum(exp_two_iterations) / len(exp_two_iterations)
    
    # Writing the results to results.txt
    with open("results.txt", "w") as results_file:
        results_file.write(f"Average iterations for experiment one: {avg_exp_one:.2f}\n")
        results_file.write(f"Average iterations for experiment two: {avg_exp_two:.2f}\n")

# Run the experiments
run_experiments()

print("Experiments completed. Results saved to single.txt, multi.txt, and results.txt.")
