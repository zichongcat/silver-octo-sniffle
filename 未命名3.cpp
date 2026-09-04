#include <stdio.h> 
 

int main()
{   int input,i,m;
    int isprime=0;
    printf("请输入你的数字\n");
    scanf("%d",&input);
    for(i=2;i<=input;i++)
    {
       for(m=2;m<i;m++)
	   {
	   	if(i%m==0)
	   	{
	   		isprime=1;
	   		break; 
		   }
		   }
		   if(isprime==1)
		   {isprime=0;
			   }else{
			   	printf("%d为素数\n",i);
			   }
			   	
	}
	if(input==1)
	{printf("这不是素数也不是合数！");
	 } 
    
    
}
		
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
   

   
   
   






 
 
 
 
 
 
 















